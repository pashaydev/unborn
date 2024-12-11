var fe=Object.defineProperty;var de=(h,e,t)=>e in h?fe(h,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):h[e]=t;var k=(h,e,t)=>de(h,typeof e!="symbol"?e+"":e,t);function O(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}let T=O();function re(h){T=h}const I={exec:()=>null};function d(h,e=""){let t=typeof h=="string"?h:h.source;const n={replace:(r,s)=>{let i=typeof s=="string"?s:s.source;return i=i.replace(w.caret,"$1"),t=t.replace(r,i),n},getRegex:()=>new RegExp(t,e)};return n}const w={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] /,listReplaceTask:/^\[[ xX]\] +/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:h=>new RegExp(`^( {0,3}${h})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:h=>new RegExp(`^ {0,${Math.min(3,h-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:h=>new RegExp(`^ {0,${Math.min(3,h-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:h=>new RegExp(`^ {0,${Math.min(3,h-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:h=>new RegExp(`^ {0,${Math.min(3,h-1)}}#`),htmlBeginRegex:h=>new RegExp(`^ {0,${Math.min(3,h-1)}}<(?:[a-z].*>|!--)`,"i")},ke=/^(?:[ \t]*(?:\n|$))+/,xe=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,be=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,C=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,we=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,ie=/(?:[*+-]|\d{1,9}[.)])/,le=d(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/).replace(/bull/g,ie).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).getRegex(),j=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,me=/^[^\n]+/,H=/(?!\s*\])(?:\\.|[^\[\]\\])+/,ye=d(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",H).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),$e=d(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,ie).getRegex(),v="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Q=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Re=d("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Q).replace("tag",v).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),oe=d(j).replace("hr",C).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",v).getRegex(),Se=d(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",oe).getRegex(),G={blockquote:Se,code:xe,def:ye,fences:be,heading:we,hr:C,html:Re,lheading:le,list:$e,newline:ke,paragraph:oe,table:I,text:me},Y=d("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",C).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",v).getRegex(),Te={...G,table:Y,paragraph:d(j).replace("hr",C).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Y).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",v).getRegex()},ze={...G,html:d(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Q).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:I,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:d(j).replace("hr",C).replace("heading",` *#{1,6} *[^
]`).replace("lheading",le).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},ae=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Ae=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,ce=/^( {2,}|\\)\n(?!\s*$)/,_e=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,Z=/[\p{P}\p{S}]/u,F=/[\s\p{P}\p{S}]/u,he=/[^\s\p{P}\p{S}]/u,Ie=d(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,F).getRegex(),Le=/\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,Ce=d(/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,"u").replace(/punct/g,Z).getRegex(),Pe=d("^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)","gu").replace(/notPunctSpace/g,he).replace(/punctSpace/g,F).replace(/punct/g,Z).getRegex(),Be=d("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,he).replace(/punctSpace/g,F).replace(/punct/g,Z).getRegex(),Ee=d(/\\(punct)/,"gu").replace(/punct/g,Z).getRegex(),qe=d(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),ve=d(Q).replace("(?:-->|$)","-->").getRegex(),Ze=d("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",ve).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),B=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,De=d(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label",B).replace("href",/<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),pe=d(/^!?\[(label)\]\[(ref)\]/).replace("label",B).replace("ref",H).getRegex(),ue=d(/^!?\[(ref)\](?:\[\])?/).replace("ref",H).getRegex(),Me=d("reflink|nolink(?!\\()","g").replace("reflink",pe).replace("nolink",ue).getRegex(),U={_backpedal:I,anyPunctuation:Ee,autolink:qe,blockSkip:Le,br:ce,code:Ae,del:I,emStrongLDelim:Ce,emStrongRDelimAst:Pe,emStrongRDelimUnd:Be,escape:ae,link:De,nolink:ue,punctuation:Ie,reflink:pe,reflinkSearch:Me,tag:Ze,text:_e,url:I},Ne={...U,link:d(/^!?\[(label)\]\((.*?)\)/).replace("label",B).getRegex(),reflink:d(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",B).getRegex()},N={...U,escape:d(ae).replace("])","~|])").getRegex(),url:d(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,"i").replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,text:/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/},Oe={...N,br:d(ce).replace("{2,}","*").getRegex(),text:d(N.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},P={normal:G,gfm:Te,pedantic:ze},A={normal:U,gfm:N,breaks:Oe,pedantic:Ne},je={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ee=h=>je[h];function R(h,e){if(e){if(w.escapeTest.test(h))return h.replace(w.escapeReplace,ee)}else if(w.escapeTestNoEncode.test(h))return h.replace(w.escapeReplaceNoEncode,ee);return h}function te(h){try{h=encodeURI(h).replace(w.percentDecode,"%")}catch{return null}return h}function ne(h,e){var s;const t=h.replace(w.findPipe,(i,l,c)=>{let o=!1,a=l;for(;--a>=0&&c[a]==="\\";)o=!o;return o?"|":" |"}),n=t.split(w.splitPipe);let r=0;if(n[0].trim()||n.shift(),n.length>0&&!((s=n.at(-1))!=null&&s.trim())&&n.pop(),e)if(n.length>e)n.splice(e);else for(;n.length<e;)n.push("");for(;r<n.length;r++)n[r]=n[r].trim().replace(w.slashPipe,"|");return n}function _(h,e,t){const n=h.length;if(n===0)return"";let r=0;for(;r<n;){const s=h.charAt(n-r-1);if(s===e&&!t)r++;else if(s!==e&&t)r++;else break}return h.slice(0,n-r)}function He(h,e){if(h.indexOf(e[1])===-1)return-1;let t=0;for(let n=0;n<h.length;n++)if(h[n]==="\\")n++;else if(h[n]===e[0])t++;else if(h[n]===e[1]&&(t--,t<0))return n;return-1}function se(h,e,t,n,r){const s=e.href,i=e.title||null,l=h[1].replace(r.other.outputLinkReplace,"$1");if(h[0].charAt(0)!=="!"){n.state.inLink=!0;const c={type:"link",raw:t,href:s,title:i,text:l,tokens:n.inlineTokens(l)};return n.state.inLink=!1,c}return{type:"image",raw:t,href:s,title:i,text:l}}function Qe(h,e,t){const n=h.match(t.other.indentCodeCompensation);if(n===null)return e;const r=n[1];return e.split(`
`).map(s=>{const i=s.match(t.other.beginningSpace);if(i===null)return s;const[l]=i;return l.length>=r.length?s.slice(r.length):s}).join(`
`)}class E{constructor(e){k(this,"options");k(this,"rules");k(this,"lexer");this.options=e||T}space(e){const t=this.rules.block.newline.exec(e);if(t&&t[0].length>0)return{type:"space",raw:t[0]}}code(e){const t=this.rules.block.code.exec(e);if(t){const n=t[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:t[0],codeBlockStyle:"indented",text:this.options.pedantic?n:_(n,`
`)}}}fences(e){const t=this.rules.block.fences.exec(e);if(t){const n=t[0],r=Qe(n,t[3]||"",this.rules);return{type:"code",raw:n,lang:t[2]?t[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):t[2],text:r}}}heading(e){const t=this.rules.block.heading.exec(e);if(t){let n=t[2].trim();if(this.rules.other.endingHash.test(n)){const r=_(n,"#");(this.options.pedantic||!r||this.rules.other.endingSpaceChar.test(r))&&(n=r.trim())}return{type:"heading",raw:t[0],depth:t[1].length,text:n,tokens:this.lexer.inline(n)}}}hr(e){const t=this.rules.block.hr.exec(e);if(t)return{type:"hr",raw:_(t[0],`
`)}}blockquote(e){const t=this.rules.block.blockquote.exec(e);if(t){let n=_(t[0],`
`).split(`
`),r="",s="";const i=[];for(;n.length>0;){let l=!1;const c=[];let o;for(o=0;o<n.length;o++)if(this.rules.other.blockquoteStart.test(n[o]))c.push(n[o]),l=!0;else if(!l)c.push(n[o]);else break;n=n.slice(o);const a=c.join(`
`),p=a.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");r=r?`${r}
${a}`:a,s=s?`${s}
${p}`:p;const u=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(p,i,!0),this.lexer.state.top=u,n.length===0)break;const g=i.at(-1);if((g==null?void 0:g.type)==="code")break;if((g==null?void 0:g.type)==="blockquote"){const b=g,x=b.raw+`
`+n.join(`
`),m=this.blockquote(x);i[i.length-1]=m,r=r.substring(0,r.length-b.raw.length)+m.raw,s=s.substring(0,s.length-b.text.length)+m.text;break}else if((g==null?void 0:g.type)==="list"){const b=g,x=b.raw+`
`+n.join(`
`),m=this.list(x);i[i.length-1]=m,r=r.substring(0,r.length-g.raw.length)+m.raw,s=s.substring(0,s.length-b.raw.length)+m.raw,n=x.substring(i.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:r,tokens:i,text:s}}}list(e){let t=this.rules.block.list.exec(e);if(t){let n=t[1].trim();const r=n.length>1,s={type:"list",raw:"",ordered:r,start:r?+n.slice(0,-1):"",loose:!1,items:[]};n=r?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=r?n:"[*+-]");const i=this.rules.other.listItemRegex(n);let l=!1;for(;e;){let o=!1,a="",p="";if(!(t=i.exec(e))||this.rules.block.hr.test(e))break;a=t[0],e=e.substring(a.length);let u=t[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,D=>" ".repeat(3*D.length)),g=e.split(`
`,1)[0],b=!u.trim(),x=0;if(this.options.pedantic?(x=2,p=u.trimStart()):b?x=t[1].length+1:(x=t[2].search(this.rules.other.nonSpaceChar),x=x>4?1:x,p=u.slice(x),x+=t[1].length),b&&this.rules.other.blankLine.test(g)&&(a+=g+`
`,e=e.substring(g.length+1),o=!0),!o){const D=this.rules.other.nextBulletRegex(x),J=this.rules.other.hrRegex(x),K=this.rules.other.fencesBeginRegex(x),V=this.rules.other.headingBeginRegex(x),ge=this.rules.other.htmlBeginRegex(x);for(;e;){const M=e.split(`
`,1)[0];let z;if(g=M,this.options.pedantic?(g=g.replace(this.rules.other.listReplaceNesting,"  "),z=g):z=g.replace(this.rules.other.tabCharGlobal,"    "),K.test(g)||V.test(g)||ge.test(g)||D.test(g)||J.test(g))break;if(z.search(this.rules.other.nonSpaceChar)>=x||!g.trim())p+=`
`+z.slice(x);else{if(b||u.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||K.test(u)||V.test(u)||J.test(u))break;p+=`
`+g}!b&&!g.trim()&&(b=!0),a+=M+`
`,e=e.substring(M.length+1),u=z.slice(x)}}s.loose||(l?s.loose=!0:this.rules.other.doubleBlankLine.test(a)&&(l=!0));let m=null,W;this.options.gfm&&(m=this.rules.other.listIsTask.exec(p),m&&(W=m[0]!=="[ ] ",p=p.replace(this.rules.other.listReplaceTask,""))),s.items.push({type:"list_item",raw:a,task:!!m,checked:W,loose:!1,text:p,tokens:[]}),s.raw+=a}const c=s.items.at(-1);c&&(c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd()),s.raw=s.raw.trimEnd();for(let o=0;o<s.items.length;o++)if(this.lexer.state.top=!1,s.items[o].tokens=this.lexer.blockTokens(s.items[o].text,[]),!s.loose){const a=s.items[o].tokens.filter(u=>u.type==="space"),p=a.length>0&&a.some(u=>this.rules.other.anyLine.test(u.raw));s.loose=p}if(s.loose)for(let o=0;o<s.items.length;o++)s.items[o].loose=!0;return s}}html(e){const t=this.rules.block.html.exec(e);if(t)return{type:"html",block:!0,raw:t[0],pre:t[1]==="pre"||t[1]==="script"||t[1]==="style",text:t[0]}}def(e){const t=this.rules.block.def.exec(e);if(t){const n=t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),r=t[2]?t[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",s=t[3]?t[3].substring(1,t[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):t[3];return{type:"def",tag:n,raw:t[0],href:r,title:s}}}table(e){var l;const t=this.rules.block.table.exec(e);if(!t||!this.rules.other.tableDelimiter.test(t[2]))return;const n=ne(t[1]),r=t[2].replace(this.rules.other.tableAlignChars,"").split("|"),s=(l=t[3])!=null&&l.trim()?t[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],i={type:"table",raw:t[0],header:[],align:[],rows:[]};if(n.length===r.length){for(const c of r)this.rules.other.tableAlignRight.test(c)?i.align.push("right"):this.rules.other.tableAlignCenter.test(c)?i.align.push("center"):this.rules.other.tableAlignLeft.test(c)?i.align.push("left"):i.align.push(null);for(let c=0;c<n.length;c++)i.header.push({text:n[c],tokens:this.lexer.inline(n[c]),header:!0,align:i.align[c]});for(const c of s)i.rows.push(ne(c,i.header.length).map((o,a)=>({text:o,tokens:this.lexer.inline(o),header:!1,align:i.align[a]})));return i}}lheading(e){const t=this.rules.block.lheading.exec(e);if(t)return{type:"heading",raw:t[0],depth:t[2].charAt(0)==="="?1:2,text:t[1],tokens:this.lexer.inline(t[1])}}paragraph(e){const t=this.rules.block.paragraph.exec(e);if(t){const n=t[1].charAt(t[1].length-1)===`
`?t[1].slice(0,-1):t[1];return{type:"paragraph",raw:t[0],text:n,tokens:this.lexer.inline(n)}}}text(e){const t=this.rules.block.text.exec(e);if(t)return{type:"text",raw:t[0],text:t[0],tokens:this.lexer.inline(t[0])}}escape(e){const t=this.rules.inline.escape.exec(e);if(t)return{type:"escape",raw:t[0],text:t[1]}}tag(e){const t=this.rules.inline.tag.exec(e);if(t)return!this.lexer.state.inLink&&this.rules.other.startATag.test(t[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(t[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(t[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(t[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:t[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:t[0]}}link(e){const t=this.rules.inline.link.exec(e);if(t){const n=t[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(n)){if(!this.rules.other.endAngleBracket.test(n))return;const i=_(n.slice(0,-1),"\\");if((n.length-i.length)%2===0)return}else{const i=He(t[2],"()");if(i>-1){const c=(t[0].indexOf("!")===0?5:4)+t[1].length+i;t[2]=t[2].substring(0,i),t[0]=t[0].substring(0,c).trim(),t[3]=""}}let r=t[2],s="";if(this.options.pedantic){const i=this.rules.other.pedanticHrefTitle.exec(r);i&&(r=i[1],s=i[3])}else s=t[3]?t[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(n)?r=r.slice(1):r=r.slice(1,-1)),se(t,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:s&&s.replace(this.rules.inline.anyPunctuation,"$1")},t[0],this.lexer,this.rules)}}reflink(e,t){let n;if((n=this.rules.inline.reflink.exec(e))||(n=this.rules.inline.nolink.exec(e))){const r=(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal," "),s=t[r.toLowerCase()];if(!s){const i=n[0].charAt(0);return{type:"text",raw:i,text:i}}return se(n,s,n[0],this.lexer,this.rules)}}emStrong(e,t,n=""){let r=this.rules.inline.emStrongLDelim.exec(e);if(!r||r[3]&&n.match(this.rules.other.unicodeAlphaNumeric))return;if(!(r[1]||r[2]||"")||!n||this.rules.inline.punctuation.exec(n)){const i=[...r[0]].length-1;let l,c,o=i,a=0;const p=r[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(p.lastIndex=0,t=t.slice(-1*e.length+i);(r=p.exec(t))!=null;){if(l=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!l)continue;if(c=[...l].length,r[3]||r[4]){o+=c;continue}else if((r[5]||r[6])&&i%3&&!((i+c)%3)){a+=c;continue}if(o-=c,o>0)continue;c=Math.min(c,c+o+a);const u=[...r[0]][0].length,g=e.slice(0,i+r.index+u+c);if(Math.min(i,c)%2){const x=g.slice(1,-1);return{type:"em",raw:g,text:x,tokens:this.lexer.inlineTokens(x)}}const b=g.slice(2,-2);return{type:"strong",raw:g,text:b,tokens:this.lexer.inlineTokens(b)}}}}codespan(e){const t=this.rules.inline.code.exec(e);if(t){let n=t[2].replace(this.rules.other.newLineCharGlobal," ");const r=this.rules.other.nonSpaceChar.test(n),s=this.rules.other.startingSpaceChar.test(n)&&this.rules.other.endingSpaceChar.test(n);return r&&s&&(n=n.substring(1,n.length-1)),{type:"codespan",raw:t[0],text:n}}}br(e){const t=this.rules.inline.br.exec(e);if(t)return{type:"br",raw:t[0]}}del(e){const t=this.rules.inline.del.exec(e);if(t)return{type:"del",raw:t[0],text:t[2],tokens:this.lexer.inlineTokens(t[2])}}autolink(e){const t=this.rules.inline.autolink.exec(e);if(t){let n,r;return t[2]==="@"?(n=t[1],r="mailto:"+n):(n=t[1],r=n),{type:"link",raw:t[0],text:n,href:r,tokens:[{type:"text",raw:n,text:n}]}}}url(e){var n;let t;if(t=this.rules.inline.url.exec(e)){let r,s;if(t[2]==="@")r=t[0],s="mailto:"+r;else{let i;do i=t[0],t[0]=((n=this.rules.inline._backpedal.exec(t[0]))==null?void 0:n[0])??"";while(i!==t[0]);r=t[0],t[1]==="www."?s="http://"+t[0]:s=t[0]}return{type:"link",raw:t[0],text:r,href:s,tokens:[{type:"text",raw:r,text:r}]}}}inlineText(e){const t=this.rules.inline.text.exec(e);if(t){const n=this.lexer.state.inRawBlock;return{type:"text",raw:t[0],text:t[0],escaped:n}}}}class y{constructor(e){k(this,"tokens");k(this,"options");k(this,"state");k(this,"tokenizer");k(this,"inlineQueue");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||T,this.options.tokenizer=this.options.tokenizer||new E,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};const t={other:w,block:P.normal,inline:A.normal};this.options.pedantic?(t.block=P.pedantic,t.inline=A.pedantic):this.options.gfm&&(t.block=P.gfm,this.options.breaks?t.inline=A.breaks:t.inline=A.gfm),this.tokenizer.rules=t}static get rules(){return{block:P,inline:A}}static lex(e,t){return new y(t).lex(e)}static lexInline(e,t){return new y(t).inlineTokens(e)}lex(e){e=e.replace(w.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){const n=this.inlineQueue[t];this.inlineTokens(n.src,n.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],n=!1){var r,s,i;for(this.options.pedantic&&(e=e.replace(w.tabCharGlobal,"    ").replace(w.spaceLine,""));e;){let l;if((s=(r=this.options.extensions)==null?void 0:r.block)!=null&&s.some(o=>(l=o.call({lexer:this},e,t))?(e=e.substring(l.raw.length),t.push(l),!0):!1))continue;if(l=this.tokenizer.space(e)){e=e.substring(l.raw.length);const o=t.at(-1);l.raw.length===1&&o!==void 0?o.raw+=`
`:t.push(l);continue}if(l=this.tokenizer.code(e)){e=e.substring(l.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="paragraph"||(o==null?void 0:o.type)==="text"?(o.raw+=`
`+l.raw,o.text+=`
`+l.text,this.inlineQueue.at(-1).src=o.text):t.push(l);continue}if(l=this.tokenizer.fences(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.heading(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.hr(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.blockquote(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.list(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.html(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.def(e)){e=e.substring(l.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="paragraph"||(o==null?void 0:o.type)==="text"?(o.raw+=`
`+l.raw,o.text+=`
`+l.raw,this.inlineQueue.at(-1).src=o.text):this.tokens.links[l.tag]||(this.tokens.links[l.tag]={href:l.href,title:l.title});continue}if(l=this.tokenizer.table(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.lheading(e)){e=e.substring(l.raw.length),t.push(l);continue}let c=e;if((i=this.options.extensions)!=null&&i.startBlock){let o=1/0;const a=e.slice(1);let p;this.options.extensions.startBlock.forEach(u=>{p=u.call({lexer:this},a),typeof p=="number"&&p>=0&&(o=Math.min(o,p))}),o<1/0&&o>=0&&(c=e.substring(0,o+1))}if(this.state.top&&(l=this.tokenizer.paragraph(c))){const o=t.at(-1);n&&(o==null?void 0:o.type)==="paragraph"?(o.raw+=`
`+l.raw,o.text+=`
`+l.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=o.text):t.push(l),n=c.length!==e.length,e=e.substring(l.raw.length);continue}if(l=this.tokenizer.text(e)){e=e.substring(l.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="text"?(o.raw+=`
`+l.raw,o.text+=`
`+l.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=o.text):t.push(l);continue}if(e){const o="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(o);break}else throw new Error(o)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var l,c,o;let n=e,r=null;if(this.tokens.links){const a=Object.keys(this.tokens.links);if(a.length>0)for(;(r=this.tokenizer.rules.inline.reflinkSearch.exec(n))!=null;)a.includes(r[0].slice(r[0].lastIndexOf("[")+1,-1))&&(n=n.slice(0,r.index)+"["+"a".repeat(r[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(r=this.tokenizer.rules.inline.blockSkip.exec(n))!=null;)n=n.slice(0,r.index)+"["+"a".repeat(r[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);for(;(r=this.tokenizer.rules.inline.anyPunctuation.exec(n))!=null;)n=n.slice(0,r.index)+"++"+n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let s=!1,i="";for(;e;){s||(i=""),s=!1;let a;if((c=(l=this.options.extensions)==null?void 0:l.inline)!=null&&c.some(u=>(a=u.call({lexer:this},e,t))?(e=e.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.escape(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.tag(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.link(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(a.raw.length);const u=t.at(-1);a.type==="text"&&(u==null?void 0:u.type)==="text"?(u.raw+=a.raw,u.text+=a.text):t.push(a);continue}if(a=this.tokenizer.emStrong(e,n,i)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.codespan(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.br(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.del(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.autolink(e)){e=e.substring(a.raw.length),t.push(a);continue}if(!this.state.inLink&&(a=this.tokenizer.url(e))){e=e.substring(a.raw.length),t.push(a);continue}let p=e;if((o=this.options.extensions)!=null&&o.startInline){let u=1/0;const g=e.slice(1);let b;this.options.extensions.startInline.forEach(x=>{b=x.call({lexer:this},g),typeof b=="number"&&b>=0&&(u=Math.min(u,b))}),u<1/0&&u>=0&&(p=e.substring(0,u+1))}if(a=this.tokenizer.inlineText(p)){e=e.substring(a.raw.length),a.raw.slice(-1)!=="_"&&(i=a.raw.slice(-1)),s=!0;const u=t.at(-1);(u==null?void 0:u.type)==="text"?(u.raw+=a.raw,u.text+=a.text):t.push(a);continue}if(e){const u="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(u);break}else throw new Error(u)}}return t}}class q{constructor(e){k(this,"options");k(this,"parser");this.options=e||T}space(e){return""}code({text:e,lang:t,escaped:n}){var i;const r=(i=(t||"").match(w.notSpaceStart))==null?void 0:i[0],s=e.replace(w.endingNewline,"")+`
`;return r?'<pre><code class="language-'+R(r)+'">'+(n?s:R(s,!0))+`</code></pre>
`:"<pre><code>"+(n?s:R(s,!0))+`</code></pre>
`}blockquote({tokens:e}){return`<blockquote>
${this.parser.parse(e)}</blockquote>
`}html({text:e}){return e}heading({tokens:e,depth:t}){return`<h${t}>${this.parser.parseInline(e)}</h${t}>
`}hr(e){return`<hr>
`}list(e){const t=e.ordered,n=e.start;let r="";for(let l=0;l<e.items.length;l++){const c=e.items[l];r+=this.listitem(c)}const s=t?"ol":"ul",i=t&&n!==1?' start="'+n+'"':"";return"<"+s+i+`>
`+r+"</"+s+`>
`}listitem(e){var n;let t="";if(e.task){const r=this.checkbox({checked:!!e.checked});e.loose?((n=e.tokens[0])==null?void 0:n.type)==="paragraph"?(e.tokens[0].text=r+" "+e.tokens[0].text,e.tokens[0].tokens&&e.tokens[0].tokens.length>0&&e.tokens[0].tokens[0].type==="text"&&(e.tokens[0].tokens[0].text=r+" "+R(e.tokens[0].tokens[0].text),e.tokens[0].tokens[0].escaped=!0)):e.tokens.unshift({type:"text",raw:r+" ",text:r+" ",escaped:!0}):t+=r+" "}return t+=this.parser.parse(e.tokens,!!e.loose),`<li>${t}</li>
`}checkbox({checked:e}){return"<input "+(e?'checked="" ':"")+'disabled="" type="checkbox">'}paragraph({tokens:e}){return`<p>${this.parser.parseInline(e)}</p>
`}table(e){let t="",n="";for(let s=0;s<e.header.length;s++)n+=this.tablecell(e.header[s]);t+=this.tablerow({text:n});let r="";for(let s=0;s<e.rows.length;s++){const i=e.rows[s];n="";for(let l=0;l<i.length;l++)n+=this.tablecell(i[l]);r+=this.tablerow({text:n})}return r&&(r=`<tbody>${r}</tbody>`),`<table>
<thead>
`+t+`</thead>
`+r+`</table>
`}tablerow({text:e}){return`<tr>
${e}</tr>
`}tablecell(e){const t=this.parser.parseInline(e.tokens),n=e.header?"th":"td";return(e.align?`<${n} align="${e.align}">`:`<${n}>`)+t+`</${n}>
`}strong({tokens:e}){return`<strong>${this.parser.parseInline(e)}</strong>`}em({tokens:e}){return`<em>${this.parser.parseInline(e)}</em>`}codespan({text:e}){return`<code>${R(e,!0)}</code>`}br(e){return"<br>"}del({tokens:e}){return`<del>${this.parser.parseInline(e)}</del>`}link({href:e,title:t,tokens:n}){const r=this.parser.parseInline(n),s=te(e);if(s===null)return r;e=s;let i='<a href="'+e+'"';return t&&(i+=' title="'+R(t)+'"'),i+=">"+r+"</a>",i}image({href:e,title:t,text:n}){const r=te(e);if(r===null)return R(n);e=r;let s=`<img src="${e}" alt="${n}"`;return t&&(s+=` title="${R(t)}"`),s+=">",s}text(e){return"tokens"in e&&e.tokens?this.parser.parseInline(e.tokens):"escaped"in e&&e.escaped?e.text:R(e.text)}}class X{strong({text:e}){return e}em({text:e}){return e}codespan({text:e}){return e}del({text:e}){return e}html({text:e}){return e}text({text:e}){return e}link({text:e}){return""+e}image({text:e}){return""+e}br(){return""}}class ${constructor(e){k(this,"options");k(this,"renderer");k(this,"textRenderer");this.options=e||T,this.options.renderer=this.options.renderer||new q,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new X}static parse(e,t){return new $(t).parse(e)}static parseInline(e,t){return new $(t).parseInline(e)}parse(e,t=!0){var r,s;let n="";for(let i=0;i<e.length;i++){const l=e[i];if((s=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&s[l.type]){const o=l,a=this.options.extensions.renderers[o.type].call({parser:this},o);if(a!==!1||!["space","hr","heading","code","table","blockquote","list","html","paragraph","text"].includes(o.type)){n+=a||"";continue}}const c=l;switch(c.type){case"space":{n+=this.renderer.space(c);continue}case"hr":{n+=this.renderer.hr(c);continue}case"heading":{n+=this.renderer.heading(c);continue}case"code":{n+=this.renderer.code(c);continue}case"table":{n+=this.renderer.table(c);continue}case"blockquote":{n+=this.renderer.blockquote(c);continue}case"list":{n+=this.renderer.list(c);continue}case"html":{n+=this.renderer.html(c);continue}case"paragraph":{n+=this.renderer.paragraph(c);continue}case"text":{let o=c,a=this.renderer.text(o);for(;i+1<e.length&&e[i+1].type==="text";)o=e[++i],a+=`
`+this.renderer.text(o);t?n+=this.renderer.paragraph({type:"paragraph",raw:a,text:a,tokens:[{type:"text",raw:a,text:a,escaped:!0}]}):n+=a;continue}default:{const o='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return n}parseInline(e,t=this.renderer){var r,s;let n="";for(let i=0;i<e.length;i++){const l=e[i];if((s=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&s[l.type]){const o=this.options.extensions.renderers[l.type].call({parser:this},l);if(o!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(l.type)){n+=o||"";continue}}const c=l;switch(c.type){case"escape":{n+=t.text(c);break}case"html":{n+=t.html(c);break}case"link":{n+=t.link(c);break}case"image":{n+=t.image(c);break}case"strong":{n+=t.strong(c);break}case"em":{n+=t.em(c);break}case"codespan":{n+=t.codespan(c);break}case"br":{n+=t.br(c);break}case"del":{n+=t.del(c);break}case"text":{n+=t.text(c);break}default:{const o='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return n}}class L{constructor(e){k(this,"options");k(this,"block");this.options=e||T}preprocess(e){return e}postprocess(e){return e}processAllTokens(e){return e}provideLexer(){return this.block?y.lex:y.lexInline}provideParser(){return this.block?$.parse:$.parseInline}}k(L,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens"]));class Ge{constructor(...e){k(this,"defaults",O());k(this,"options",this.setOptions);k(this,"parse",this.parseMarkdown(!0));k(this,"parseInline",this.parseMarkdown(!1));k(this,"Parser",$);k(this,"Renderer",q);k(this,"TextRenderer",X);k(this,"Lexer",y);k(this,"Tokenizer",E);k(this,"Hooks",L);this.use(...e)}walkTokens(e,t){var r,s;let n=[];for(const i of e)switch(n=n.concat(t.call(this,i)),i.type){case"table":{const l=i;for(const c of l.header)n=n.concat(this.walkTokens(c.tokens,t));for(const c of l.rows)for(const o of c)n=n.concat(this.walkTokens(o.tokens,t));break}case"list":{const l=i;n=n.concat(this.walkTokens(l.items,t));break}default:{const l=i;(s=(r=this.defaults.extensions)==null?void 0:r.childTokens)!=null&&s[l.type]?this.defaults.extensions.childTokens[l.type].forEach(c=>{const o=l[c].flat(1/0);n=n.concat(this.walkTokens(o,t))}):l.tokens&&(n=n.concat(this.walkTokens(l.tokens,t)))}}return n}use(...e){const t=this.defaults.extensions||{renderers:{},childTokens:{}};return e.forEach(n=>{const r={...n};if(r.async=this.defaults.async||r.async||!1,n.extensions&&(n.extensions.forEach(s=>{if(!s.name)throw new Error("extension name required");if("renderer"in s){const i=t.renderers[s.name];i?t.renderers[s.name]=function(...l){let c=s.renderer.apply(this,l);return c===!1&&(c=i.apply(this,l)),c}:t.renderers[s.name]=s.renderer}if("tokenizer"in s){if(!s.level||s.level!=="block"&&s.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");const i=t[s.level];i?i.unshift(s.tokenizer):t[s.level]=[s.tokenizer],s.start&&(s.level==="block"?t.startBlock?t.startBlock.push(s.start):t.startBlock=[s.start]:s.level==="inline"&&(t.startInline?t.startInline.push(s.start):t.startInline=[s.start]))}"childTokens"in s&&s.childTokens&&(t.childTokens[s.name]=s.childTokens)}),r.extensions=t),n.renderer){const s=this.defaults.renderer||new q(this.defaults);for(const i in n.renderer){if(!(i in s))throw new Error(`renderer '${i}' does not exist`);if(["options","parser"].includes(i))continue;const l=i,c=n.renderer[l],o=s[l];s[l]=(...a)=>{let p=c.apply(s,a);return p===!1&&(p=o.apply(s,a)),p||""}}r.renderer=s}if(n.tokenizer){const s=this.defaults.tokenizer||new E(this.defaults);for(const i in n.tokenizer){if(!(i in s))throw new Error(`tokenizer '${i}' does not exist`);if(["options","rules","lexer"].includes(i))continue;const l=i,c=n.tokenizer[l],o=s[l];s[l]=(...a)=>{let p=c.apply(s,a);return p===!1&&(p=o.apply(s,a)),p}}r.tokenizer=s}if(n.hooks){const s=this.defaults.hooks||new L;for(const i in n.hooks){if(!(i in s))throw new Error(`hook '${i}' does not exist`);if(["options","block"].includes(i))continue;const l=i,c=n.hooks[l],o=s[l];L.passThroughHooks.has(i)?s[l]=a=>{if(this.defaults.async)return Promise.resolve(c.call(s,a)).then(u=>o.call(s,u));const p=c.call(s,a);return o.call(s,p)}:s[l]=(...a)=>{let p=c.apply(s,a);return p===!1&&(p=o.apply(s,a)),p}}r.hooks=s}if(n.walkTokens){const s=this.defaults.walkTokens,i=n.walkTokens;r.walkTokens=function(l){let c=[];return c.push(i.call(this,l)),s&&(c=c.concat(s.call(this,l))),c}}this.defaults={...this.defaults,...r}}),this}setOptions(e){return this.defaults={...this.defaults,...e},this}lexer(e,t){return y.lex(e,t??this.defaults)}parser(e,t){return $.parse(e,t??this.defaults)}parseMarkdown(e){return(n,r)=>{const s={...r},i={...this.defaults,...s},l=this.onError(!!i.silent,!!i.async);if(this.defaults.async===!0&&s.async===!1)return l(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof n>"u"||n===null)return l(new Error("marked(): input parameter is undefined or null"));if(typeof n!="string")return l(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(n)+", string expected"));i.hooks&&(i.hooks.options=i,i.hooks.block=e);const c=i.hooks?i.hooks.provideLexer():e?y.lex:y.lexInline,o=i.hooks?i.hooks.provideParser():e?$.parse:$.parseInline;if(i.async)return Promise.resolve(i.hooks?i.hooks.preprocess(n):n).then(a=>c(a,i)).then(a=>i.hooks?i.hooks.processAllTokens(a):a).then(a=>i.walkTokens?Promise.all(this.walkTokens(a,i.walkTokens)).then(()=>a):a).then(a=>o(a,i)).then(a=>i.hooks?i.hooks.postprocess(a):a).catch(l);try{i.hooks&&(n=i.hooks.preprocess(n));let a=c(n,i);i.hooks&&(a=i.hooks.processAllTokens(a)),i.walkTokens&&this.walkTokens(a,i.walkTokens);let p=o(a,i);return i.hooks&&(p=i.hooks.postprocess(p)),p}catch(a){return l(a)}}}onError(e,t){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,e){const r="<p>An error occurred:</p><pre>"+R(n.message+"",!0)+"</pre>";return t?Promise.resolve(r):r}if(t)return Promise.reject(n);throw n}}}const S=new Ge;function f(h,e){return S.parse(h,e)}f.options=f.setOptions=function(h){return S.setOptions(h),f.defaults=S.defaults,re(f.defaults),f};f.getDefaults=O;f.defaults=T;f.use=function(...h){return S.use(...h),f.defaults=S.defaults,re(f.defaults),f};f.walkTokens=function(h,e){return S.walkTokens(h,e)};f.parseInline=S.parseInline;f.Parser=$;f.parser=$.parse;f.Renderer=q;f.TextRenderer=X;f.Lexer=y;f.lexer=y.lex;f.Tokenizer=E;f.Hooks=L;f.parse=f;f.options;f.setOptions;f.use;f.walkTokens;f.parseInline;$.parse;y.lex;export{L as Hooks,y as Lexer,Ge as Marked,$ as Parser,q as Renderer,X as TextRenderer,E as Tokenizer,T as defaults,O as getDefaults,f as marked};
