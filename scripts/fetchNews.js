import fs from "fs";
import * as cheerio from "cheerio";

const NEWS_URLS = {
  general: "https://www.nirmalbang.com/ajaxpages/AjaxNewsUpdates.aspx?SecID=7&SubSecID=15&pageNo=1&PageSize=10",
  derivative: "https://responsiveweb.acesphereonline.com/AjaxPages/AjaxNewsUpdates.aspx?SecID=4&SubSecID=47&pageNo=1&PageSize=50",
  derivativeFallback: "https://www.nirmalbang.com/ajaxpages/AjaxNewsUpdates.aspx?SecID=4&SubSecID=47&pageNo=1&PageSize=50"
};

function normalizeDate(dateLine) {
  if (!dateLine) return "";
  const match = dateLine.match(/([A-Za-z]+)-(\d{2})-(\d{4}).*?(\d{2}):(\d{2})/);
  const months = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
  if (match) {
    return `${match[2]}-${months[match[1]]}-${match[3]} ${match[4]}:${match[5]}`;
  }
  return dateLine.trim();
}

async function fetchHtml(url, referer) {
  const resp = await fetch(url, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "Referer": referer || url,
      "User-Agent": "Mozilla/5.0"
    }
  });
  return await resp.text();
}

function parseHtmlNews(html) {
  const $ = cheerio.load(html);
  const items = [];
  $(".GrNewsMainView").each((i, el) => {
    const headline = $(el).find(".GrNewsHead").text().trim();
    const dateLine = $(el).find(".GrNewsDate").text().trim();
    if (headline) {
      items.push({
        headline,
        date: normalizeDate(dateLine)
      });
    }
  });
  return items;
}

async function run() {
  let generalItems = [];
  try {
    const html = await fetchHtml(NEWS_URLS.general, "https://www.nirmalbang.com/");
    generalItems = parseHtmlNews(html);
  } catch (e) {
    console.warn("General news fetch failed:", e.message);
  }

  let derivativeItems = [];
  try {
    const html = await fetchHtml(NEWS_URLS.derivative, "https://responsiveweb.acesphereonline.com/");
    derivativeItems = parseHtmlNews(html);
  } catch (e) {
    console.warn("Derivative fetch failed, fallback:", e.message);
    try {
      const html = await fetchHtml(NEWS_URLS.derivativeFallback, "https://www.nirmalbang.com/");
      derivativeItems = parseHtmlNews(html);
    } catch (err) {
      console.warn("Derivative fallback failed:", err.message);
    }
  }

  const output = {
    general: generalItems.slice(0,10),
    derivative: derivativeItems.slice(0,4),
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync("data/news.json", JSON.stringify(output, null, 2));
  console.log("✅ News updated:", output.lastUpdated);
}

run();
