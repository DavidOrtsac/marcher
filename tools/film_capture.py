#!/usr/bin/env python3
"""Record the 30 s demo from the live app: film_capture.py OUT_DIR [fps] [WxH] [base_url]
Steps the page's deterministic film (?film) one frame at a time and screenshots each frame,
then encodes H.264 with ffmpeg. Runs headless on the GPU."""
import sys, os, asyncio, subprocess
from playwright.async_api import async_playwright

out = sys.argv[1]; fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
w, h = map(int, (sys.argv[3] if len(sys.argv) > 3 else '1920x1080').split('x'))
base = sys.argv[4] if len(sys.argv) > 4 else 'http://127.0.0.1:8480/'
# the film's own timeline is 30 s. Stepping it a little faster lands the video at 29 s, inside the 30 s limit.
SPEED = 30 / 29
os.makedirs(out + '/frames', exist_ok=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
        await pg.goto(base + '?film')
        await pg.wait_for_function('window.__film && window.__film.ready', timeout=120000)
        await pg.wait_for_timeout(1500)
        n = 0
        while True:
            more = await pg.evaluate(f'__film.step({SPEED / fps})')
            await pg.evaluate('__film.wait')     # the drill route, computed in the worker
            await pg.wait_for_timeout(5)
            await pg.screenshot(path=f'{out}/frames/{n:04d}.jpg', type='jpeg', quality=94)
            n += 1
            if not more: break
        print('\n'.join(logs[-10:]))
        await b.close()
        return n

n = asyncio.run(main())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(fps), '-i', f'{out}/frames/%04d.jpg',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', f'{out}/marcher_demo.mp4'], check=True)
print(n, 'frames ->', f'{out}/marcher_demo.mp4')
