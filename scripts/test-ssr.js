async function test() {
  const res = await fetch("https://omni-ai-5uz8.onrender.com/purchase-orders?supplier=SUP-001");
  const text = await res.text();

  if (text.includes("This page didn't load") || text.includes("Something went wrong")) {
    console.log("ERROR PAGE ON RENDER!");
  } else {
    console.log("SUCCESS PAGE ON RENDER!");
  }
}

test();
