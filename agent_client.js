import fs from 'fs';
import https from 'https';

const API_KEY = process.env.PERPLEXITY_API_KEY;
if (!API_KEY) {
  console.error("Please set the PERPLEXITY_API_KEY environment variable.");
  process.exit(1);
}

const API_URL = "https://api.perplexity.ai/v1/agent";

// Custom function example
function getWeather(location) {
  console.log(`\n[Executing custom function: get_weather(location='${location}')]`);
  return JSON.stringify({
    location,
    temperature: "72F",
    condition: "Sunny",
    humidity: "45%"
  });
}

const tools = [
  { type: "web_search" },
  { type: "fetch_url", max_urls: 3 },
  {
    type: "function",
    name: "get_weather",
    description: "Get current weather for a location",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. San Francisco, CA"
        }
      },
      required: ["location"]
    }
  }
];

async function streamAgentResponse(inputItems) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "sonar-pro",
      input: inputItems,
      stream: true,
      tools: tools
    });

    const req = https.request(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => reject(new Error(`API Error ${res.statusCode}: ${errorData}`)));
        return;
      }

      const functionCalls = [];
      const messages = [];
      let buffer = '';

      res.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const dataStr = line.substring(6).trim();
          if (dataStr === '[DONE]') {
            resolve({ functionCalls, messages });
            return;
          }

          try {
            const event = JSON.parse(dataStr);
            const eventType = event.type;

            // 1. Reasoning Tokens
            if ([
              "response.reasoning.started", 
              "response.reasoning.search_queries",
              "response.reasoning.search_results",
              "response.reasoning.fetch_url_queries",
              "response.reasoning.fetch_url_results",
              "response.reasoning.stopped"
            ].includes(eventType)) {
              console.log(`\n[Reasoning Step: ${eventType}]`);
              if (event.thought) console.log(`Thought: ${event.thought}`);
              if (event.queries) console.log(`Search Queries: ${JSON.stringify(event.queries)}`);
              if (event.results) console.log(`Found ${event.results.length} search results.`);
              if (event.urls) console.log(`Fetching URLs: ${JSON.stringify(event.urls)}`);
            }
            // 2. Tool use executions
            else if (eventType === "response.output_item.added") {
              const item = event.item || {};
              if (item.type === "function_call") console.log(`\n[Tool Execution Started: ${item.name}]`);
              else if (item.type === "search_results") console.log(`\n[Native Tool Execution: Web Search]`);
              else if (item.type === "fetch_url_results") console.log(`\n[Native Tool Execution: Fetch URL]`);
            }
            // Text delta
            else if (eventType === "response.output_text.delta") {
              process.stdout.write(event.delta || "");
            }
            // 3. Tool execution results
            else if (eventType === "response.output_item.done") {
              const item = event.item || {};
              if (item.type === "function_call") {
                functionCalls.push(item);
                console.log(`\n[Tool Execution Completed: ${item.name} with args ${item.arguments}]`);
              } else if (item.type === "search_results") {
                console.log(`\n[Native Tool Results: ${(item.results || []).length} results found]`);
              } else if (item.type === "fetch_url_results") {
                console.log(`\n[Native Tool Results: ${(item.contents || []).length} URLs fetched]`);
              } else if (item.type === "message") {
                messages.push(item);
              }
            }
            else if (eventType === "response.failed") {
              console.error(`\n[Error]`, event.error);
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks if any
          }
        }
      });

      res.on('end', () => {
        if (buffer.trim() && buffer.startsWith('data: ')) {
           // Process any remaining buffer if needed
        }
        console.log('\n');
        resolve({ functionCalls, messages });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("Starting Perplexity Agentic Research API Streaming Client...");
  
  const inputItems = [
    {
      type: "message",
      role: "user",
      content: "What is the weather in San Francisco? Also, search the web for the latest news about AI."
    }
  ];

  while (true) {
    console.log("\n--- Sending Request to Agentic Research API ---");
    const { functionCalls, messages } = await streamAgentResponse(inputItems);

    for (const msg of messages) {
      const textContent = (msg.content || [])
        .filter(part => part.type === "text")
        .map(part => part.text)
        .join("");
      
      if (textContent) {
        inputItems.push({
          type: "message",
          role: "assistant",
          content: textContent
        });
      }
    }

    if (!functionCalls || functionCalls.length === 0) {
      console.log("Interaction complete.");
      break;
    }

    for (const call of functionCalls) {
      let args = {};
      try {
        args = JSON.parse(call.arguments || "{}");
      } catch (e) {}

      inputItems.push({
        type: "function_call",
        name: call.name,
        arguments: call.arguments,
        call_id: call.call_id,
        thought_signature: call.thought_signature
      });

      let output = "";
      if (call.name === "get_weather") {
        output = getWeather(args.location);
      } else {
        output = JSON.stringify({ error: `Unknown function ${call.name}` });
      }

      inputItems.push({
        type: "function_call_output",
        name: call.name,
        call_id: call.call_id,
        output: output,
        thought_signature: call.thought_signature
      });
    }
  }
}

main().catch(console.error);
