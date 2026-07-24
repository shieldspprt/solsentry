"use strict";(()=>{var e={};e.id=587,e.ids=[587],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8235:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>h,patchFetch:()=>m,requestAsyncStorage:()=>c,routeModule:()=>d,serverHooks:()=>u,staticGenerationAsyncStorage:()=>p});var a={};o.r(a),o.d(a,{GET:()=>l});var n=o(49303),s=o(88716),r=o(60670),i=o(87070);async function l(){let e=`# SolSentry AI Agent DeFi Risk Engine for Solana

SolSentry is an open source safety middleware, quantitative risk engine, and policy engine for AI agents interacting with Solana DeFi protocols. Before executing any swap, lend, borrow, stake, or perp transaction, agents query SolSentry for a provenance-tagged safety score (with a confidence band), position health, stress-test exposure, and policy guardrail decisions.

## Scoring model (v3): grounded and honest

Every factor carries its data source, timestamp, and confidence. Live signals are pulled from Pyth (oracle confidence interval + publish staleness), Helius (on-chain token holder concentration), and DeFiLlama (TVL, fees). Where live data is unavailable a factor falls back to a documented model default AND its confidence is lowered — the response's confidence band widens accordingly. Direction is explicit: safetyScore is 0..10 where HIGHER = SAFER. Treat the confidence band, not the point score, as the decision input.

## Model Context Protocol (MCP) Standard Server

SolSentry operates a standard MCP server for Claude, ElizaOS, GPT, Solana Agent Kit, and custom AI agents. Responses include structured content, a model version, and a data-as-of timestamp for reproducibility.

### MCP Tools Available:

1. solsentry_preflight(action, protocolSlug, amountUsd, [portfolio state])
FIRST call before any transaction. Combines risk + policy into a single PROCEED / DO_NOT_PROCEED verdict with reasons, maxAllowedUsd (largest amount that would pass), top risk drivers, trend, and safer alternatives.

2. solsentry_check_protocol_risk(protocolSlug)
Provenance-tagged safety score (0..10, higher = safer) with a confidence band, per-factor breakdown and sources, top drivers, what-would-flip conditions, 7d/30d trend, and an automated agent decision.

3. solsentry_evaluate_policy(action, protocolSlug, amountUsd, [currentDailyVolumeUsd, currentDrawdownPct, openPositionsCount])
Checks single-tx caps, daily volume, drawdown, position count, and risk floor. Returns maxAllowedUsd and same-category alternatives when blocked. Pass portfolio state so volume/drawdown/position limits bind.

4. solsentry_stress_test(priceShockPct?, walletAddress?, agentId?, protocolSlug?)
Simulates an adverse price move (default suite -10/-20/-35). Pass walletAddress to stress REAL on-chain positions. Reports which positions liquidate, capital at risk, cascade exposure, projected portfolio health, time-to-liquidation estimates, and the collateral needed to restore a safe health factor.

5. solsentry_get_position_health(walletAddress?, agentId?, protocolSlug?)
Pass walletAddress to read REAL on-chain positions with LIVE health factors (Kamino lending obligations today; Drift pending). Returns per-position health factor, imminent-liquidation flags, and recommended actions. Without a wallet it reads stored/sample positions. Also available over REST: POST /api/v1/positions/read {"walletAddress"}.

6. solsentry_get_protocol_list() / solsentry_get_business_ratios(protocolSlug)
Protocol registry with ratings, and per-protocol capital efficiency, fee/TVL, utilization, and web-community telemetry.

## Supported Solana DeFi Protocols & Launchpads
Kamino Finance (lending), Drift Protocol (perps), Jupiter (dex), Orca (dex), Raydium (dex), Meteora (dex), Marinade Finance (staking), Jito (staking), Pumpfun (launchpad).
`;return new i.NextResponse(e,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=3600"}})}let d=new n.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/llms.txt/route",pathname:"/llms.txt",filename:"route",bundlePath:"app/llms.txt/route"},resolvedPagePath:"/Users/abdurrehman/Desktop/Build/AgentGate/app/llms.txt/route.ts",nextConfigOutput:"",userland:a}),{requestAsyncStorage:c,staticGenerationAsyncStorage:p,serverHooks:u}=d,h="/llms.txt/route";function m(){return(0,r.patchFetch)({serverHooks:u,staticGenerationAsyncStorage:p})}}};var t=require("../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),a=t.X(0,[948,972],()=>o(8235));module.exports=a})();