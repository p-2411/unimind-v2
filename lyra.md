Code Quality Guide & Requirements
Owner: @Alfie :head-alfie:
MAKE SURE TO BOOK YOUR 1 ON 1 WITH ALFIE VIA: bit.ly/alfie30

Our template: https://github.com/lyratechnologies/template

* Follow this particular folder structure: https://github.com/alan2207/bulletproof-react/tree/master/apps/nextjs-app
* Follow this pattern to organise all your types: https://youtu.be/KeabgbA-Paw?si=y_531ZSy2kywxlDf
* No component file exceeds 300 lines of code, ideally within 200 lines, below are resources to help keep your components clean:
    * https://www.tymzap.com/blog/the-magic-of-keeping-one-abstraction-level-per-function
    * https://www.developerway.com/posts/components-composition-how-to-get-it-right
    * https://www.youtube.com/watch?v=Lbj3vmp8spI&t=883s
    * https://www.youtube.com/watch?v=d3mhZbBOxbE
* No unused imports
* No deprecation errors on install
* Errors are properly handled, if you don't how: https://youtu.be/OQQAv8t3bfc?si=k8hODPWx5ACyNQja (also ask alfie:))
* Have descriptive names for your db migrations
* Try to understand adopt prefetch & suspense query pattern: https://trpc.io/docs/client/react/server-components


Codebase Onboarding Agent
Problem

Engineers waste hours/days orienting in unfamiliar repos. An agent that reads, searches, and explains the codebase accelerates onboarding.

Stack

Layer
	Tech

API
	FastAPI

Agents
	OpenAI Agents SDK

Workflows
	Temporal

Storage
	Postgres + pgvector

Frontend
	Next.js

Streaming
	SSE


Agents

Router — classifies question, hands off to specialist
Explorer — finds things

* Tools: list_files, search_code, read_file

Tracer — follows execution paths

* Tools: read_file, find_references, get_dependencies

Explainer — summarises and synthesises

* Tools: search_indexed, read_file, git_log

Tools

Tool
	Input
	Output

list_files(path, glob)
	dir path + pattern
	file paths

read_file(path, start, end)
	file path + line range
	file contents

search_code(query, file_type)
	text/regex + optional filter
	matching lines with file:line

find_references(symbol)
	function/class name
	list of file:line where it's used

get_dependencies(path)
	file path
	list of imports and what they resolve to

search_indexed(query)
	natural language
	top-k relevant code chunks from pgvector

git_log(path, n)
	file/dir path + count
	recent commits with messages


Workflows (Temporal)

Index Repo

1. Clone repo
2. Walk file tree, skip non-code
3. Chunk files by function/class (tree-sitter) with fixed-size fallback
4. Embed chunks (OpenAI)
5. Store in pgvector
6. Generate per-directory summaries

Answer Query

1. Ensure repo is indexed
2. Router agent classifies and hands off to specialist
3. Specialist calls tools, builds answer
4. If low confidence — pause, wait for human input, resume
5. Return answer with file references

Milestones

Milestone 1: Scaffold

FastAPI + Temporal + Postgres running locally via Docker. A dummy workflow that triggers from an API call and returns a result. Proves the three systems talk to each other.
Done when: API call triggers a Temporal workflow, result comes back.

Milestone 2: Indexing Pipeline

Accept a GitHub repo URL, clone it, chunk the code, embed it, store in pgvector.
Done when: Index a repo, run a vector similarity query, get back relevant code chunks.

Milestone 3: Single Agent with File Tools

Explorer agent that answers "where is X?" by searching the cloned repo using file tools.
Done when: Ask 5 "where is X?" questions against an indexed repo, agent finds the right files every time.

Milestone 4: RAG

Semantic search over embedded code. Explainer agent uses it to answer "explain X" questions. Minimal router to direct "where" questions to Explorer and "explain" questions to Explainer.
Done when: Ask "explain how auth works in this project" — agent retrieves relevant chunks, reads the files, produces an accurate explanation citing specific files.

Milestone 5: Multi-Agent + Handoffs

Full Router + Explorer + Tracer + Explainer using OpenAI Agents SDK handoffs. Each agent scoped to its own tools. Tracer can follow import chains and call paths.
Done when: 10 test questions across 3 types all route to the correct specialist and return grounded answers.

Milestone 6: Human-in-the-Loop

When the agent hits ambiguity (e.g. finds two auth systems, doesn't know which one you mean), the Temporal workflow pauses and waits for user clarification before resuming.
Done when: Workflow pauses, survives a server restart while paused, resumes correctly when the user responds.

Milestone 7: Streaming UI

Next.js chat interface that shows agent reasoning step-by-step in real-time — tool calls, handoffs, intermediate thinking, final answer. HITL prompts appear inline.
Done when: You can watch the agent think live and respond to clarification requests in the chat.

Milestone 8: Observability

Dashboard showing query stats (volume, latency, cost, error rate) and a per-query trace viewer showing which agents ran, which tools were called, and where time was spent.
Done when: Run 20 queries, dashboard shows accurate stats, clicking a query shows the full trace.

Baseline vs. Stretch


	Milestones
	Outcome

Baseline (everyone ships)
	1–4
	Working agent that indexes repos and answers questions using file tools + RAG

Stretch (faster engineers)
	5–8
	Multi-agent handoffs, durable HITL, streaming UI, observability


# N8N
N8N 101Owner: @kb
Length: 3-5 days

🎯 Ultimate Goal:

Build a chat bot to automate managing Gmail and Calendar.

Functionalities - This chat bot should be able to:

* Summarize you mails in any day or periods of requested day
* List all the action needed to be done (emails that haven't been responded, events need to be added) 
* Be able to provide information about any mail asked
* Manage your calendar (create, delete, update events)
* Be able to detect collapsing events in calendar, recommend and reschedule event (if the event is saved in the calendar)
* Automate the creation of events mentioned in email into calendar

After that:

* Create a workflow that run twice a day, automate summarising email, tasks need to do and calendar creation, update,...
* Send report every run into a separate Slack workspace. DO NOT add this bot into Lyra. Create a new workspace to test it.

Technical requirements:

* Everything should be done in n8n
* Don't have to implement chat UI, simply use the chat in n8n is enough
* Demo on Loom to test the functionalities



:page_with_curl: Tutorials:

N8N Documentation: https://docs.n8n.io/ (Recommended, read when needed)
Read before start (create n8n workspace first, should have 14 days free trial):

* https://docs.n8n.io/workflows/create/
* https://docs.n8n.io/workflows/components/
* https://docs.n8n.io/workflows/executions/
* https://docs.n8n.io/credentials/

Refer to the documentation for any additional information.

# Trades
Trade Secret[CONFIDENTIAL] do not share this with anyone outside Lyra. I know u want to... keep it inside pls. This is the engineering “trade secret” we’ve gathered from working in startups for >2 years. @Nam Dao (sleeping)

General

* Always understand AI generated code. NEVER EVER just blindly accept AI code if you don't understand what's happening @Anthony Kroeger
* Keep PR size smaller than 300 lines so its easy to review @Nam Dao (sleeping) 
* Default t3 app’s eslint is useless, disable as much of it as possible @Anthony Kroeger (a lot of the rules feel unnecessary but don’t disable them for no reason)
* Use Github Desktop for safe git operations https://github.com/apps/desktop @Nam Dao (sleeping) 
* [Tip] Learn Vim motions by typing vimtutor in your terminal for the basics then watch Primeagen on Youtube for better techniques, it’ll make you code minimum 1.5x faster @Anthony Kroeger 
* [Tip] Only import the methods that u’re using rather than whole package or it’ll slow down ur build @Anthony Kroeger 


Cursor Extensions

@Nam Dao (sleeping) Required:
@Anthony Kroeger Optional:


Frontend

* Use https://tinypng.com/ to compress images without quality loss @user 
* When you’re doing a big FE migration, always leave the OG file and create a new file for the react components. Say you’re editing a big /company page, make a /company2 page and work on that. Once done. Use the original page as a point to compare and see if you’ve migrated it correctly :prayge: @user 
* Always better to use onMutate, onSuccess and onError provided by trpc. Reason is bc u can keep the 'logic' part of the code at the top, and keep the tsx part more html/tailwind :pray::skin-tone-2: @user 
* List of component library to use by @user 
    * https://magicui.design/
    * https://ui.aceternity.com/
    * https://ui.shadcn.com/
        * https://tweakcn.com/ - configure your theme for shadcn and ability to export it to your globals.css file
    * https://www.tremor.so/
    * https://headlessui.com/
    * https://nextui.org/


Tanstack table library

* Don’t forget to use useMemo when constructing the columns, or else performance will be potato @user 
* Better to have all the column creation code in a seperate file to where you’re calling the useReactTable() @user 


Inspirations

* Look at dribble to get UI inspirations @user
* Mobbin (dev@lyra account)


Backend

* When dealing with medium to large data sets, we should do sorting and filtering in the backend. Reason being if you’re writing a real app, inevitably the data will grow and u will need to implement infinite query. In that case, u can’t just sort & filter in the frontend bc its not being sorted on ALL the data. Also its more performant in the backend bc you can guarantee that it will only be run once, vs react may re-render and run the sort code many times - @user
* When writing unique fetch in prisma always good to use findUniqueOrThrow rather than doing findUnique and then into an if (!data) {throw} @user 
* [Tip] Dependency flow should be 1 way: Service gets called by → Trpc → gets called by frontend. Never do a service calling trpc calling a service @user 
* [Tip] In Prisma, please do not set empty fields to "" . Use null correctly. Avoid below. Instead, set as null so later when we query by field name = null, it actually shows them. @user 


Database

* Use Int as primary key for SQL, so it’s easy to use cursor type pagination since it’s sorted. @user 
* Fields used in lookups should have index. If we commonly search the field Name on a person table with >1m records, add index to that field! @user 
* (IMPORTANT) 
* Common myth - can’t apply @unique on nullable fields. Yes u can! @unique ignores null fields @user 
* Prisma warnings in generated SQL will often save ur life! read it b4 merging in @user 


* [Tip] createManyAndReturn useful when u need to get data/id right away.
* Potentially useful tool for optimising queries - https://www.prisma.io/docs/optimize
* 



Infra

* If you ever need to set up datadog with railway, use https://github.com/ferretcode/locomotive @user 
    * In addition to ENVIRONMENT_ID + the two required variables, you’ll also need these environment variables: INGEST_URL=https://http-intake.logs.datadoghq.com/api/v2/logs
        ADDITIONAL_HEADERS=DD-API-KEY=<DD_API_KEY>;DD-APPLICATION-KEY=<DD_APP_KEY>


IDE

* Add following prompt into cursor settings > Rules for AI (make sure to edit the Python part to be your relevant language) @user 
    * You are an expert AI programming assistant in VSCode that primarily focuses on producing clear, readable Python code. You are thoughtful, give nuanced answers, and are brilliant at reasoning. You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning. Follow the user's requirements carefully & to the letter. First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail. Confirm, then write code! Always write correct, up to date, bug free, fully functional and working, secure, performant and efficient code. Focus on readability over being performant. Fully implement all requested functionality. Leave NO todo's, placeholders or missing pieces. Ensure code is complete! Verify thoroughly finalized. Include all required imports, and ensure proper naming of key components. Be concise. Minimize any other prose. If you think there might not be a correct answer, you say so. If you do not know the answer, say so instead of guessing. 



Chrome Extension

Owner: @user 
Monorepo: https://github.com/t3-oss/create-t3-turbo
Extension Stack: https://wxt.dev/ (wxt > crxvite as crxvite is no longer maintained)

* Create a monorepo using create-t3-turbo
* Delete all apps that you do not need in your repo
* Switch ORM from Drizzle to Prisma
* Install wxt dev as an app in the monorepo
* Use next app to provide api endpoint for certain reverse engineered api calls



AI

Owner: @user 

* AI Engineering 101: https://www.aihero.dev/ai-engineer-roadmap
* Vercel AI SDK 101: https://www.aihero.dev/vercel-ai-sdk-tutorial
* Claude Cookbook: https://github.com/anthropics/anthropic-cookbook/tree/main (tool use section is very useful)
* Structured Output: 
    * Claude: https://github.com/anthropics/courses/blob/master/tool_use/03_structured_outputs.ipynb
    * Openai: https://platform.openai.com/docs/guides/structured-outputs/introduction
    * Vercel AI SDK: https://ai-sdk.dev/providers/ai-sdk-providers/openai#structured-outputs
    * Tool calling: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling (needed for claude)



Code Quality Guide & Requirements

Owner: @user :head-alfie:

* Follow this particular folder structure: https://github.com/alan2207/bulletproof-react/tree/master/apps/nextjs-app
* Follow this pattern to organise all your types: https://youtu.be/KeabgbA-Paw?si=y_531ZSy2kywxlDf
* No component file exceeds 300 lines of code, ideally within 200 lines, below are resources to help keep your components clean:
    * https://www.tymzap.com/blog/the-magic-of-keeping-one-abstraction-level-per-function
    * https://www.developerway.com/posts/components-composition-how-to-get-it-right
    * https://www.youtube.com/watch?v=Lbj3vmp8spI&t=883s
* No unused imports
* No deprecation errors on install
* Errors are properly handled, if you don't how: https://youtu.be/OQQAv8t3bfc?si=k8hODPWx5ACyNQja (also ask alfie:))
* Have descriptive names for your db migrations
* Try to understand adopt prefetch & suspense query pattern: https://trpc.io/docs/client/react/server-components



 Technology + Useful Tools

Databases

* GCP - TBD


Frontend

* Shadcn for components + tweakcn to configure styling - amazing since you can export the styles from tweakcn to a globals.css file


Project Management

* Linear - used at Paraform, 10/10 app in my opinion, has a nice clean UI, mobile app, kanban and list views, intuitive and useful shortcuts, MCP


Queues

* GCP Tasks - really easy to set up and is managed for you


Storage

* GCP Cloud Storage - pretty easy to set up (EXPENSIVE)
* Neon - super easy DX, good pricing, really easy setup


PR Reviews

* greptile - seems pretty good at catching bugs and also comments on code style too
* Cursor Bugbot - good at catching bugs, logic mistakes, and just mistakes you might’ve missed, but doesn’t comment on code style like greptile


AI Code Assistants

* Cursor - best tab autocomplete by 5 billion light years, nothing I’ve tried even comes close, copilot and windsurf felt like I was lagging badly, also the agent/chat is really good too and it’s cheap (no way it’s staying this cheap forever) @user 
* Claude Code/Codex - INSANELY good because it takes in a crazy amount of context, a bit pricey ($200 USD/month for the best plan) but I think it’s worth personally and think it’ll be nerfed soon. You can use multiple instances of it and code multiple things at once, and has plan mode so you can verify before it implements.



PR Reviews



Code Solution Snippets

https://www.notion.so/2392df86305680aeaf89fb63902e98b2?v=2392df86305680bab892000c12aa7bd2
Low priority but will be adding to this document over time (sign in with dev@lyra to contribute/view) with example code solutions that we can reference and learn from
