import hashlib,json,re,shutil,time,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
root='https://www.philosophyofintelligence.life/common-earth/'
filename='district-growth.js'
wanted=hashlib.sha256(Path('after/common-earth',filename).read_bytes()).hexdigest()
for attempt in range(22):
    url=root+'?release='+wanted[:12]+'&qa='+str(attempt)
    req=urllib.request.Request(url,headers={'Cache-Control':'no-cache','User-Agent':'Common Earth release verification'})
    try:
        html=urllib.request.urlopen(req,timeout=12).read().decode()
        stamp=re.search(r'src="district-growth.js\?v=([0-9a-f]+)"',html).group(1)
        asset=urllib.request.urlopen(root+filename+'?v='+stamp,timeout=12).read()
        actual=hashlib.sha256(asset).hexdigest()
        if actual.startswith(stamp) and (actual==wanted or
            all(record in asset for record in [b'Council financed part of the first commercial deed',b'Commercial deed repayment',b'shopDebt'])):break
    except Exception as e: print('Waiting for publication',e,flush=True)
    time.sleep(8)
else: raise RuntimeError('The published street simulation did not match this release')
print('LIVE-ASSET',actual,'build asset',wanted,flush=True)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('google-chrome'),args=['--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1280,'height':800},device_scale_factor=1.5,has_touch=True,is_mobile=True)
    issues=[];page.on('pageerror',lambda e:issues.append(str(e)))
    fixture=Path('fixture.json').read_text()
    page.add_init_script("if(!sessionStorage.verified){localStorage.setItem('common-earth.world.v1',"+json.dumps(fixture)+");sessionStorage.verified=1}")
    page.goto(url,wait_until='load')
    page.get_by_role('button',name='See streets in Shore Allotments',exact=True).click(timeout=30000)
    page.locator('#housing-bar button[aria-controls="housing-directory"]').click()
    print('LIVE-HOUSING',page.locator('#housing-title').inner_text(),flush=True)
    for name in ['unhoused','vacant','works','records']:
        page.locator('#housing-directory select:has(option[value="unhoused"])').select_option(name)
        print('LIVE-DIRECTORY',name,page.locator('.housing-results').inner_text()[:95],flush=True)
    page.locator('#housing-directory').get_by_role('button',name='Close',exact=True).click()
    page.locator('#town-centre-shortcut').click()
    print('LIVE-CENTRE',page.locator('#town-centre').inner_text()[:280],flush=True)
    assert not issues,issues
    browser.close()
