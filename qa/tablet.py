"""Run the same seeded world and gesture sequence against two local checkouts."""
import json, os, shutil
from playwright.sync_api import sync_playwright
from pathlib import Path
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which("google-chrome"),args=["--disable-dev-shm-usage"])
    print("BROWSER",browser.version,flush=True)
    for variant in ["before","after","after","before"]:
        ctx=browser.new_context(viewport={"width":1280,"height":800},device_scale_factor=1.5,is_mobile=True,has_touch=True)
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda e:errors.append(str(e)))
        cdp=ctx.new_cdp_session(page)
        cdp.send("Emulation.setCPUThrottlingRate",{"rate":4})
        snapshot=Path("fixture.json").read_text()
        page.add_init_script("if(!sessionStorage.bench){localStorage.setItem('common-earth.world.v1',"+json.dumps(snapshot)+");sessionStorage.bench='1'}")
        page.goto("http://127.0.0.1:8123/"+variant+"/common-earth/?profile=1",wait_until="load")
        page.get_by_role("button",name="See streets in Shore Allotments",exact=True).click(timeout=25000)
        canvas=page.locator("#observer-canvas")
        canvas.scroll_into_view_if_needed()
        page.wait_for_timeout(1000)
        if variant=="after":
            hud=page.locator("#ribbon-population")
            hud.click()
            print("DIRECTORY",page.locator("#town-centre-title").inner_text(),page.locator(".town-row").count(),flush=True)
            page.get_by_role("button",name="Recruitment",exact=True).click()
            page.get_by_role("button",name="Entry and reputation",exact=True).click()
            page.locator("#town-centre-close").click()
            canvas.scroll_into_view_if_needed()
        box=canvas.bounding_box()
        x,y=box["x"]+box["width"]*.53,box["y"]+box["height"]*.48
        page.evaluate("""() => {window.gaps=[];window.measuring=true;let prior=0;function frame(t){if(prior)gaps.push(t-prior);prior=t;if(measuring)requestAnimationFrame(frame)}requestAnimationFrame(frame)}""")
        for k in range(4):
            cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":x,"y":y}]})
            for i in range(40):
                cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":x+(i+1)*2*(-1 if k%2 else 1),"y":y+(i+1)*.25}]})
                page.wait_for_timeout(12)
            cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]})
        data=page.evaluate("""() => {measuring=false;const a=gaps.sort((a,b)=>a-b);return {n:a.length,slow:a.filter(x=>x>34).length,fps:1000*a.length/a.reduce((n,v)=>n+v,0),p95:a[Math.ceil(a.length*.95)-1],draw:EarthPerformance.sample('draw'),touch:EarthPerformance.sample('input'),motion:EarthPerformance.sample('frame'),ready:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd}}""")
        print("TABLET",variant,json.dumps(data),"ERRORS",errors,flush=True)
        assert not errors
        ctx.close()
    browser.close()
