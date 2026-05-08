const axios = require('axios');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const { saveFile } = require('./files.js');
const { program } = require('commander');
const cheerio = require('cheerio');
const beautify = require('js-beautify').html;

program
    .option('-d, --directory <type>', 'Directory', './data/html')
    .option('-n, --name <type>', 'File name (required)')
    .option('-e, --extension <type>', 'File extension', '.html')
    .option('-s, --source-document-id <type>', 'Source Document ID (required)')
    .option('-r, --rdk <type>', 'RDK parameter for pagination')
    .option('-l, --link-id <type>', 'Link ID parameter', '0')
    .option('--start-page <type>', 'Starting page number', '1')
    .option('--end-page <type>', 'Ending page number (if not specified, will try to detect)', '1')
    .option('--max-pages <type>', 'Maximum number of pages to attempt', '10')
    .option('--combine', 'Combine all pages into single file')
    .parse(process.argv);

const options = program.opts();
if (!options.name || !options.sourceDocumentId) {
  console.log('--name and --source-document-id are required');
  process.exit(1);
}

const directory = options.directory.endsWith('/') ? options.directory : options.directory + '/';
const startPage = parseInt(options.startPage);
const endPage = options.endPage ? parseInt(options.endPage) : null;
const maxPages = parseInt(options.maxPages);

function buildUrl(sourceDocumentId, page, rdk, linkId) {
  let url = `http://pravo.gov.ru/proxy/ips/?doc_itself=&nd=${sourceDocumentId}`;

  if (page > 1 || rdk) {
    url += `&page=${page}`;
    if (rdk) {
      url += `&rdk=${rdk}`;
    }
    url += `&link_id=${linkId || 0}`;
  } else {
    url += '&fulltext=1';
  }

  return url;
}

function transformHtml(html) {
  html = html.replace(/^.*<div\s*id="text_content"\s*>\s*/s, '');
  html = html.replace(/\s*<\/div>\s*<\/div>\s*<\/body>\s*<\/html>\s*$/s, '');
  html = html.replaceAll('windows-1251', 'utf-8');

  html = html.replaceAll('?docbody', 'http://pravo.gov.ru/proxy/ips/?docbody'); // обратные ссылки на источник

  const $ = cheerio.load(html);

  $('html').attr('style', 'display: table; margin: auto;');
  $('body').attr('style', `font-size: 18px; line-height: 125%; word-wrap: break-word; display: table-cell; vertical-align: middle;`);

  html = beautify($.html(), { indent_size: 2 });

  html = html.replaceAll('font-family: "times new roman", times, serif;', 'font-family: Helvetica, sans-serif;');

  return html;
}

async function loadPage(sourceDocumentId, page, rdk, linkId, timeout = 120000) {
  const url = buildUrl(sourceDocumentId, page, rdk, linkId);

  console.log(`Loading page ${page}: ${url}`);

  try {
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: timeout,
    });

    let html = iconv.decode(Buffer.from(response.data), 'win1251');

    // Check if page has content (not empty or error page)
    if (html.length < 100 || html.includes('Документ не найден') || html.includes('Document not found')) {
      return null;
    }

    html = transformHtml(html);

    return {
      page: page,
      html: html,
      size: html.length
    };

  } catch (error) {
    console.log(`Page ${page} failed: ${error.message}`);
    return null;
  }
}

async function loadAllPages() {
  const pages = [];
  const failures = [];

  console.log(`Starting to load pages from ${startPage} to ${endPage || 'auto-detect'} (max ${maxPages})`);

  let currentPage = startPage;
  let consecutiveFailures = 0;

  while (currentPage <= (endPage || startPage + maxPages - 1) && consecutiveFailures < 3) {
    const result = await loadPage(options.sourceDocumentId, currentPage, options.rdk, options.linkId);

    if (result) {
      pages.push(result);
      consecutiveFailures = 0;
      console.log(`✓ Page ${currentPage} loaded (${result.size} chars)`);

      // If we're auto-detecting and only requested page 1, break after first successful page
      if (!endPage && !options.rdk && currentPage === startPage) {
        break;
      }
    } else {
      failures.push(currentPage);
      consecutiveFailures++;
      console.log(`✗ Page ${currentPage} failed`);

      // If first page fails, stop immediately
      if (currentPage === startPage) {
        break;
      }
    }

    currentPage++;

    // Add delay between requests to be respectful
    if (currentPage <= (endPage || startPage + maxPages - 1)) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return { pages, failures };
}

async function main() {
  const { pages, failures } = await loadAllPages();

  if (pages.length === 0) {
    console.error('No pages were successfully loaded');
    process.exit(1);
  }

  console.log(`\nLoaded ${pages.length} page(s), ${failures.length} failed`);

  if (options.combine && pages.length > 1) {
    // Combine all pages into a single HTML file
    let combinedHtml = pages.map(p => `<!-- Page ${p.page} -->\n${p.html}`).join('\n\n');
    const fileName = options.name + options.extension;
    saveFile(directory + fileName, combinedHtml);
    console.log(`Combined document saved as ${fileName}`);
  } else {
    // Save each page separately
    for (const pageData of pages) {
      const fileName = pages.length > 1
        ? `${options.name}-page-${pageData.page}${options.extension}`
        : `${options.name}${options.extension}`;
      saveFile(directory + fileName, pageData.html);
      console.log(`Page ${pageData.page} saved as ${fileName}`);
    }
  }

  if (failures.length > 0) {
    console.log(`Failed pages: ${failures.join(', ')}`);
  }

  console.log(`Document loading completed`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});