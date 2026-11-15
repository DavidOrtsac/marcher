#!/usr/bin/env python3
"""Stills from the demo film at given times: film_stills.py OUT_PREFIX t1 t2 ..."""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    pre = sys.argv[1]; times = [float(x) for x in sys.argv[2:]]
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto('http://127.0.0.1:8480/?film')
        await pg.wait_for_function('window.__film && window.__film.ready', timeout=120000)
        for t in times:
            await pg.evaluate(f'(async()=>{{ while (__film.t < {t}) {{ __film.step(1/30); if (__film.wait) await __film.wait; if ((__film.t*30|0) % 15 === 0) await new Promise(r=>setTimeout(r,0)); }} }})()')
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{pre}_{t:05.1f}.jpg', type='jpeg', quality=80)
        print('\n'.join(logs[-10:]))
        await b.close()
asyncio.run(main())
