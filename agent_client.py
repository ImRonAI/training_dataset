from perplexity import Perplexity
import json

client = Perplexity()

# Define a custom function tool
tools = [
    {"type": "web_search"},
    {"type": "fetch_url"},
    {
        "type": "function",
        "name": "get_stock_price",
        "description": "Get the current stock price for a given ticker symbol.",
        "parameters": {
            "type": "object",
            "properties": {
                "ticker": {
                    "type": "string",
                    "description": "Stock ticker symbol, e.g. AAPL"
                }
            },
            "required": ["ticker"]
        }
    }
]

# Your actual function implementation
def get_stock_price(ticker: str) -> str:
    return json.dumps({"ticker": ticker, "price": 198.50, "currency": "USD"})

# --- STREAMING REQUEST with max settings ---
print("=== Streaming with full reasoning traces ===\n")

stream = client.responses.create(
    model="openai/gpt-5.4",
    input="What are the latest AI developments? Also look up the AAPL stock price.",
    tools=tools,
    instructions="Use web_search for current info. Use fetch_url for full articles. Use get_stock_price for stock data.",
    reasoning={"effort": "high"},       # Maximum reasoning effort
    max_output_tokens=8192,             # Maximum output tokens
    max_steps=10,                       # Maximum reasoning/tool steps (API max)
    stream=True
)

# Process all streaming event types including reasoning traces
for event in stream:
    if event.type == "response.reasoning.started":
        print(f"\n[REASONING STARTED] {getattr(event, 'thought', '')}")
    elif event.type == "response.reasoning.stopped":
        print(f"[REASONING STOPPED] {getattr(event, 'thought', '')}")
    elif event.type == "response.output_text.delta":
        print(event.delta, end="")
    elif event.type == "response.output_item.added":
        print(f"\n[OUTPUT ITEM ADDED] type={getattr(event, 'item', {})}")
    elif event.type == "response.output_item.done":
        print(f"\n[OUTPUT ITEM DONE]")
    elif event.type == "response.completed":
        resp = event.response
        print(f"\n\n=== COMPLETED ===")
        print(f"Usage: {resp.usage}")

# --- NON-STREAMING REQUEST with function calling loop ---
print("\n\n=== Non-streaming with function call handling ===\n")

response = client.responses.create(
    model="openai/gpt-5.4",
    input="Search for the latest AI news, fetch a relevant article, and get the AAPL stock price.",
    tools=tools,
    instructions="Use all available tools to answer comprehensively.",
    reasoning={"effort": "high"},
    max_output_tokens=8192,
    max_steps=10,
)

# Print all output items: search results, fetch results, function calls, messages
for item in response.output:
    if item.type == "search_results":
        print(f"[WEB SEARCH] Queries: {item.queries}")
        for r in item.results:
            print(f"  - {r.title}: {r.url}")
    elif item.type == "fetch_url_results":
        print(f"[FETCH URL] Fetched {len(item.contents)} page(s)")
        for c in item.contents:
            print(f"  - {c.title}: {c.url}")
    elif item.type == "function_call":
        print(f"[FUNCTION CALL] {item.name}({item.arguments})")
    elif item.type == "message":
        print(f"[MESSAGE] {item.content[0].text[:200]}...")

# Handle function calls if present
next_input = [item.model_dump() for item in response.output]
has_function_calls = False

for item in response.output:
    if item.type == "function_call":
        has_function_calls = True
        args = json.loads(item.arguments)
        if item.name == "get_stock_price":
            result = get_stock_price(args["ticker"])
        else:
            result = json.dumps({"error": "Unknown function"})

        next_input.append({
            "type": "function_call_output",
            "call_id": item.call_id,
            "output": result
        })
        print(f"[FUNCTION RESULT] {item.name} -> {result}")

# Send function results back for final response
if has_function_calls:
    final_response = client.responses.create(
        model="openai/gpt-5.4",
        input=next_input,
        reasoning={"effort": "high"},
        max_output_tokens=8192,
    )
    print(f"\n[FINAL RESPONSE]\n{final_response.output_text}")
    print(f"\n[USAGE] {final_response.usage}")
else:
    print(f"\n[FINAL RESPONSE]\n{response.output_text}")
    print(f"\n[USAGE] {response.usage}")
