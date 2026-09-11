import asyncio
from aiohttp import ClientSession, ClientTimeout
from aiohttp_socks import ProxyConnector

async def main():
    connector = ProxyConnector.from_url("socks5://yyRZkMcA:zQ8WMyL4@142.252.99.207:64269")
    timeout = ClientTimeout(total=120)
    async with ClientSession(connector=connector, timeout=timeout) as session:
        for i in range(5):
            try:
                async with session.get("https://api.telegram.org") as resp:
                    print(i, resp.status)
                    await resp.text()
            except Exception as e:
                print(i, "ERROR", type(e).__name__, e)
            await asyncio.sleep(1)

asyncio.run(main())