const https = require("https");
const url = "https://nominatim.openstreetmap.org/search?q=airport,mumbai&format=json&limit=1";
https.get(url, { headers: { "User-Agent": "SymbioteWebScrapper/1.0" } }, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    console.log(JSON.parse(data)[0]);
  });
});
