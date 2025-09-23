// Example of how to use the new pagination support
// This script demonstrates various ways to load documents with pagination

const { execSync } = require('child_process');

console.log('🔧 Russian Law Document Pagination Examples\n');

// Example 1: Load a document that works with standard approach
console.log('📖 Example 1: Standard document load (Constitution)');
try {
  execSync('node ../load-paginated-html.js --name="constitution-example" --source-document-id=102027595',
    { stdio: 'inherit', timeout: 30000 });
  console.log('✅ Standard load completed\n');
} catch (error) {
  console.log('⚠️  Standard load may have timed out - this is the issue we\'re solving\n');
}

// Example 2: Load with pagination parameters
console.log('📄 Example 2: Load with pagination parameters');
console.log('Usage: node load-paginated-html.js --name="document-name" --source-document-id=102074277 --rdk=835 --start-page=1 --end-page=3');
console.log('This would attempt to load pages 1-3 of document 102074277 with rdk=835\n');

// Example 3: Auto-detect mode
console.log('🔍 Example 3: Auto-detection mode');
console.log('Usage: node load-paginated-html.js --name="auto-doc" --source-document-id=102074277 --rdk=835 --max-pages=5');
console.log('This would try up to 5 pages and stop when pages fail to load\n');

// Example 4: Combine pages
console.log('📚 Example 4: Combine multiple pages into single file');
console.log('Usage: node load-paginated-html.js --name="combined-doc" --source-document-id=102074277 --rdk=835 --start-page=1 --end-page=5 --combine');
console.log('This would load pages 1-5 and combine them into a single HTML file\n');

console.log('💡 The new pagination script supports these scenarios:');
console.log('   • Documents that timeout with fulltext=1 parameter');
console.log('   • Documents that require rdk and page parameters');
console.log('   • Loading individual pages or ranges of pages');
console.log('   • Combining multiple pages into single documents');
console.log('   • Automatic detection of available pages');

console.log('\n🎯 Solution for GitHub Issue #1:');
console.log('   The URL from the issue can now be loaded as:');
console.log('   node load-paginated-html.js --name="issue-1-doc" --source-document-id=102074277 --rdk=835 --link-id=0 --start-page=1 --max-pages=10');
console.log('   This will try to load up to 10 pages with proper pagination parameters.');