import fs from "node:fs";
import path from "node:path";
import process from "node:process";
const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const errors=[];
const slugs=["derevni-aromadyfuzory", "kvitkovi-aromadyfuzory", "svizhi-aromadyfuzory", "hotelni-aromaty-dlya-domu", "aromadyfuzor-dlya-vitalni", "aromadyfuzor-dlya-vannoi"];
const index=fs.readFileSync(path.join(root,"guides","index.html"),"utf8");
const chapterPos=index.indexOf("Chapter IV · Scent as interior");
const chapter3Pos=index.indexOf("Chapter III · Living with scent");
if(chapterPos<0) errors.push("Chapter IV missing");
if(chapter3Pos<0 || chapterPos<chapter3Pos) errors.push("Chapter IV must follow Chapter III");
if(!index.includes('"@type":"ItemList"') || !index.includes('"numberOfItems":21')) errors.push("Journal ItemList schema must contain all 21 articles");
for(let i=0;i<slugs.length;i++){
  const slug=slugs[i]; const file=path.join(root,"guides",`${slug}.html`);
  if(!fs.existsSync(file)){errors.push(`missing article ${slug}`);continue;}
  const html=fs.readFileSync(file,"utf8");
  for(const required of ['rel="canonical"','@type":"Article"','article-lead','article-note','related-guides','va-home-release']) if(!html.includes(required)) errors.push(`${slug} missing ${required}`);
  if(!html.includes(`· ${16+i}<`)) errors.push(`${slug} has incorrect editorial number`);
  if(!index.includes(`href="${slug}.html"`)) errors.push(`${slug} missing from Journal index`);
  if(!fs.existsSync(path.join(root,"images","journal",`${slug}.webp`))) errors.push(`${slug} image missing`);
  if(!fs.readFileSync(path.join(root,"sitemap.xml"),"utf8").includes(`/guides/${slug}.html`)) errors.push(`${slug} missing from sitemap`);
  if(!fs.readFileSync(path.join(root,"image-sitemap.xml"),"utf8").includes(`/images/journal/${slug}.webp`)) errors.push(`${slug} missing from image sitemap`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(JSON.stringify({ok:true,journalArticles:21,newArticles:slugs.length,chapterOrder:true},null,2));
