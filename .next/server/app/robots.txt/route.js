"use strict";(()=>{var e={};e.id=703,e.ids=[703],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},99882:(e,t,o)=>{o.r(t),o.d(t,{originalPathname:()=>c,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>x,staticGenerationAsyncStorage:()=>d});var r={};o.r(r),o.d(r,{GET:()=>i});var a=o(49303),s=o(88716),l=o(60670),n=o(87070);async function i(){let e=`User-agent: *
Allow: /
Allow: /llms.txt
Allow: /api/v1/
Allow: /.well-known/ai-plugin.json
Disallow: /dashboard/
Disallow: /dashboard/*

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: AhrefsBot
Allow: /

Sitemap: http://localhost:3000/sitemap.xml
`;return new n.NextResponse(e,{status:200,headers:{"Content-Type":"text/plain; charset=utf-8","Cache-Control":"public, max-age=3600"}})}let u=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/robots.txt/route",pathname:"/robots.txt",filename:"route",bundlePath:"app/robots.txt/route"},resolvedPagePath:"/Users/abdurrehman/Desktop/Build/AgentGate/app/robots.txt/route.ts",nextConfigOutput:"",userland:r}),{requestAsyncStorage:p,staticGenerationAsyncStorage:d,serverHooks:x}=u,c="/robots.txt/route";function g(){return(0,l.patchFetch)({serverHooks:x,staticGenerationAsyncStorage:d})}}};var t=require("../../webpack-runtime.js");t.C(e);var o=e=>t(t.s=e),r=t.X(0,[948,972],()=>o(99882));module.exports=r})();