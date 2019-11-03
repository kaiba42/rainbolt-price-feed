const fetch = require('node-fetch')

const rainbolt = `http://localhost:3030`
const decimalPrecision = 100000000
const balance = 100 * decimalPrecision

const updateMarketData = async () => {
    const res = await fetch("http://api.coingecko.com/api/v3/simple/price?ids=cosmos,bitcoin&vs_currencies=usd")
    let json = await res.json()
    console.log("Sending data to rainbolt", json)
    // send market data to rainboltd
    json.bitcoin.usd = Math.floor(json.bitcoin.usd * decimalPrecision)
    json.cosmos.usd = Math.floor(json.cosmos.usd * decimalPrecision)
    await fetch(`${rainbolt}/marketData`, {
        method: "POST",
        body: JSON.stringify(json),
        headers: {
            'Content-Type': 'application/json'
        },
    })
}

const run = async () => {
    // create a maker
    await fetch(`${rainbolt}/maker/init/${balance}`, { method: "POST"})

    // create a taker
    const takerOrder = {
        initial_margin: 100,
        order_size: 100,
        maker_order_id: "someAddressOnCosmos"
    }
    await fetch(`${rainbolt}/taker/order`, {
        method: "POST",
        body: JSON.stringify(takerOrder),
        headers: {
            'Content-Type': 'application/json'
        },
    })

    // fill in initial market data (2x because we need a well defined price delta)
    await updateMarketData()
    await updateMarketData()

    // continue updating data, and paying out the contract
    setInterval(async () => {
        await updateMarketData()
        
        console.log("Settling swap contract...")
        // pay according to the contract
        await fetch(`${rainbolt}/taker/pay`, {
            method: "POST",
        })
        console.log("Paid in full!")
    }, 60000); // every minute
}

run()
