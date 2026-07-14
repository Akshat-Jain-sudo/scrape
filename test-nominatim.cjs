const axios = require("axios");

async function run() {
  try {
    const pickupRes = await axios.get("https://nominatim.openstreetmap.org/search?q=airport,mumbai&format=json&limit=1", { headers: { "User-Agent": "SymbioteWebScrapper/1.0" }});
    const dropRes = await axios.get("https://nominatim.openstreetmap.org/search?q=bandra,mumbai&format=json&limit=1", { headers: { "User-Agent": "SymbioteWebScrapper/1.0" }});
    const p1 = pickupRes.data[0];
    const p2 = dropRes.data[0];
    console.log("Pickup:", p1.lat, p1.lon);
    console.log("Drop:", p2.lat, p2.lon);

    const osrmRes = await axios.get(`https://router.project-osrm.org/route/v1/driving/${p1.lon},${p1.lat};${p2.lon},${p2.lat}?overview=false`);
    console.log("Distance:", osrmRes.data.routes[0].distance / 1000, "km");
    console.log("Duration:", osrmRes.data.routes[0].duration / 60, "mins");
  } catch(e) {
    console.error(e.message);
  }
}
run();
