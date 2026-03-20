const fs = require('fs');
const spec = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));

console.log('--- ApiChatCompletionsRequest ---');
console.log(JSON.stringify(spec.components.schemas.ApiChatCompletionsRequest, null, 2));

console.log('\n--- CompletionResponse ---');
console.log(JSON.stringify(spec.components.schemas.CompletionResponse, null, 2));

console.log('\n--- Tool / Function Calling related schemas ---');
const toolSchemas = Object.keys(spec.components.schemas).filter(k => k.toLowerCase().includes('tool') || k.toLowerCase().includes('function'));
toolSchemas.forEach(k => {
  console.log(`\n--- ${k} ---`);
  console.log(JSON.stringify(spec.components.schemas[k], null, 2));
});
