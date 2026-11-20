"""Exercise the Quote Desk on the isolated storefront build with sample API responses."""

from base64 import urlsafe_b64encode
from datetime import date, timedelta
import re
from urllib.parse import urlsplit
import json
from time import time
from playwright.sync_api import expect

fixture='https://themebrowserfixture.supabase.co'
staff='7604d57c-daaa-4b84-b855-72491c179901'
enquiry='7604d57c-daaa-4b84-b855-72491c179903'
old_date=(date.today()-timedelta(days=1)).isoformat()
new_date=(date.today()+timedelta(days=2)).isoformat()
valid_date=(date.today()+timedelta(days=7)).isoformat()
def encode(value): return urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')

def verify(browser, base, width):
    rows=[]
    page_errors=[]
    user={'id':staff,'aud':'authenticated','role':'authenticated','email':'quote-staff@example.invalid','app_metadata':{},'user_metadata':{}}
    expires=int(time())+3600
    token=encode({'alg':'HS256','typ':'JWT'})+'.'+encode({'sub':staff,'exp':expires,'aud':'authenticated','role':'authenticated'})+'.fixture'
    ctx=browser.new_context(viewport={'width':width,'height':900}, service_workers='block')
    def handler(route):
        request=route.request
        url=urlsplit(request.url)
        origin=f'{url.scheme}://{url.netloc}'
        if origin==base: return route.continue_()
        if origin!=fixture: return route.abort()
        headers={'access-control-allow-origin':base,'access-control-allow-methods':'GET, POST, OPTIONS',
                 'access-control-allow-headers':request.headers.get('access-control-request-headers','*')}
        if request.method=='OPTIONS': return route.fulfill(status=204,headers=headers)
        if url.path=='/auth/v1/token': return route.fulfill(headers=headers,json={'access_token':token,'refresh_token':'local-fixture','expires_in':3600,'expires_at':expires,'token_type':'bearer','user':user})
        if url.path=='/auth/v1/user': return route.fulfill(headers=headers,json=user)
        assert request.headers.get('authorization')=='Bearer '+token, url.path
        name=url.path.rsplit('/',1)[-1]
        payload=request.post_data_json if request.method=='POST' else {}
        if name=='corporate_is_admin': data=True
        elif name=='corporate_staff_role': data='staff'
        elif name in ('corporate_products','corporate_orders','corporate_list_shop_orders'): data=[]
        elif name=='corporate_quote_desk_enquiries':
            data=[row for row in rows if not payload['p_overdue'] or row['follow_up_on']<date.today().isoformat()]
        elif name=='corporate_log_enquiry':
            assert payload['p_source']=='whatsapp' and payload['p_phone']=='+27821230000' and payload['p_follow_up_on']==old_date
            rows.append(dict(id=enquiry,kind='service',customer_name=payload['p_name'],email='',topic=payload['p_topic'],
                message=payload['p_message'],status='new',assigned_to=staff,created_at='2026-11-20T13:00:00Z',
                updated_at='2026-11-20T13:00:01Z',notification_status='not_configured',items=[],source='whatsapp',
                contact_phone=payload['p_phone'],follow_up_on=old_date,quote_status=None,
                quote_valid_until=None,quote_lines=[],quote_total_cents=0))
            data=enquiry
        elif name=='corporate_set_enquiry_follow_up':
            row=rows[0]
            assert payload['p_updated_at']==row['updated_at'] and payload['p_follow_up_on']==new_date
            row.update(follow_up_on=new_date, updated_at='2026-11-20T13:00:02Z')
            data=True
        elif name=='corporate_save_enquiry_quote':
            row=rows[0]
            assert payload['p_id']==enquiry and payload['p_updated_at']==row['updated_at']
            state=payload['p_status']
            if state=='draft':
                assert payload['p_valid_until']==valid_date
                assert payload['p_lines']==[{'title':'Installation','quantity':2,'unit_price_cents':15000},{'title':'Delivery','quantity':1,'unit_price_cents':7500}]
                row.update(quote_lines=payload['p_lines'],quote_valid_until=valid_date,quote_total_cents=37500)
            else:
                assert payload['p_lines'] is None and payload['p_valid_until'] is None
                if state=='sent': row['status']='in_progress'
            row.update(quote_status=state,updated_at=f"2026-11-20T13:00:0{['draft','sent','accepted'].index(state)+3}Z")
            data=True
        else: raise AssertionError(url.path)
        route.fulfill(headers=headers,json=data)
    ctx.route('**/*',handler)
    page=ctx.new_page()
    page.on('pageerror',lambda e:page_errors.append(str(e)))
    page.goto(base+'/admin/#enquiries')
    login=page.locator('form').filter(has=page.get_by_role('heading',name='Administrator sign in'))
    login.get_by_label('Email',exact=True).fill('quote-staff@example.invalid')
    login.get_by_label('Password',exact=True).fill('FixturePassword123!')
    login.get_by_role('button',name='Sign in to dashboard').click()
    expect(page.get_by_role('heading',name='Customer enquiries')).to_be_visible()
    page.get_by_text('Log a WhatsApp or email enquiry',exact=True).click()
    page.get_by_label('Customer name',exact=True).fill('Sample buyer')
    page.get_by_label('WhatsApp number').fill('+27821230000')
    page.get_by_label('Subject',exact=True).fill('Installation request')
    page.get_by_label('Enquiry details').fill('Please quote for two installations.')
    page.get_by_label('Follow-up date',exact=True).fill(old_date)
    page.get_by_role('button',name='Log enquiry',exact=True).click()
    card=page.get_by_role('article',name='Installation request')
    expect(card.get_by_text('Assigned to you')).to_be_visible()
    overdue=page.get_by_role('checkbox',name='Overdue follow-ups only')
    overdue.check()
    expect(card.get_by_text('Overdue',exact=True)).to_be_visible()
    card.get_by_label('Follow-up date').fill(new_date)
    card.get_by_role('button',name='Save follow-up').click()
    expect(page.get_by_text('No enquiries in this view.')).to_be_visible()
    overdue.uncheck()
    card.get_by_text('Prepare a quote',exact=True).click()
    card.get_by_label('Valid until').fill(valid_date)
    card.get_by_label('Item 1',exact=True).fill('Installation')
    card.get_by_label('Quantity',exact=True).fill('2')
    card.get_by_label('Unit price (R)',exact=True).fill('150')
    card.get_by_role('button',name='Add line item').click()
    card.get_by_label('Item 2',exact=True).fill('Delivery')
    card.get_by_label('Unit price (R)',exact=True).nth(1).fill('75')
    card.get_by_role('button',name='Save quote draft').click()
    expect(card.get_by_text('Quote · Draft',exact=True)).to_be_visible()
    expect(card.get_by_text(re.compile(r'^R\s*375,00$'))).to_be_visible()
    card.get_by_role('button',name='Mark as sent').click()
    expect(card.get_by_text('Quote · Sent',exact=True)).to_be_visible()
    card.get_by_role('button',name='Mark as accepted').click()
    expect(card.get_by_text('Quote · Accepted',exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not page_errors,page_errors
    print(f'PASS {width}px: isolated staff login, WhatsApp enquiry, overdue filter, reschedule, draft, sent, accepted',flush=True)
    ctx.close()
