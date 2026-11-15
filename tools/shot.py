#!/usr/bin/env python3
"""Headless screenshot on the real GPU: shot.py out.png [wait_ms] [js] [query] [WxH] [settle_ms]
Pass the query ?debug to reach the app object (window.__app) from the js argument."""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    out = sys.argv[1]; wait = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    js = sys.argv[3] if len(sys.argv) > 3 else ''
    q = sys.argv[4] if len(sys.argv) > 4 else ''
    w, h = (map(int, sys.argv[5].split('x')) if len(sys.argv) > 5 else (1600, 900))
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--mute-audio'])
        pg = await b.new_page(viewport={'width': w, 'height': h})
        await pg.route('**/api.nasa.gov/**', lambda r: r.abort())   # tests do not spend the shared NASA key
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto(q if q.startswith('http') else 'http://127.0.0.1:8480/' + q)
        await pg.wait_for_timeout(wait)
        if js:
            r = await pg.evaluate(js)
            if r is not None: print('JS:', r)
            await pg.wait_for_timeout(int(sys.argv[6]) if len(sys.argv) > 6 else 3000)
        await pg.screenshot(path=out)
        print('\n'.join(logs[-25:]))
        await b.close()
asyncio.run(main())
