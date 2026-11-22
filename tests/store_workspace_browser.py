"""Representative merchant tasks using the existing isolated staff login fixture."""
import re
from os import environ
from pathlib import Path

from playwright.sync_api import expect

def workspace_records(resource):
    if resource == 'corporate_products':
        return [dict(sku=sku, title=title, stock=stock, published=published, description='',
                     options='', image_url='', price_cents=19900, updated_at='2026-01-01T12:00:00Z')
                for sku, title, stock, published in [('A','Desk charger',2,True),
                                                     ('B','Laptop sleeve',None,False),
                                                     ('C','USB cable',30,True)]]
    base = dict(customer_name='Example buyer', email='buyer@example.invalid', items=[],
                created_at='2026-01-01T12:00:00Z', updated_at='2026-01-01T12:00:00Z', subtotal_cents=19900)
    if resource == 'corporate_orders':
        return [dict(base,id='request-'+status,status=status,notes='') for status in ('requested','reviewed')]
    return [dict(base,id='order-'+state,payment_status=payment,fulfilment_status=state,
                 total_cents=19900,phone='',fulfilment_method='collection',payment_events=[],fulfilment_cents=0)
            for payment,state in [('paid','processing'),('paid','delivered'),('pending','awaiting_payment')]]

def review_workspace(page, width):
    # Use the same signed-in session as the quote workflow.
    page.evaluate("location.hash = 'dashboard'")
    def check_layout(screen):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,screen)
        if directory := environ.get('STORE_REVIEW_IMAGES'):
            Path(directory).mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(Path(directory) / f'{screen}-{width}.png'))

    home = page.get_by_role('heading', level=1, name='Home')
    expect(home).to_be_visible()
    check_layout('home')
    page.get_by_role('button',name=re.compile('Paid orders to fulfil')).click()
    expect(page.locator('.shop-order-card')).to_have_count(1)
    expect(page.locator('.shop-order-badges')).to_contain_text('processing')
    check_layout('fulfilment')
    page.get_by_role('button', name='All shop orders').click()
    expect(page.locator('.shop-order-card')).to_have_count(3)
    page.get_by_label('Payment status').select_option('pending')
    expect(page.locator('.shop-order-card')).to_have_count(1)
    page.go_back()
    expect(page.get_by_role('heading',name='Paid orders to fulfil')).to_be_visible()
    page.go_back()
    expect(home).to_be_visible()
    page.get_by_role('button',name=re.compile('Requests to review')).click()
    expect(page.get_by_label('Request status')).to_have_value('requested')
    expect(page.locator('.order-card')).to_have_count(1)
    page.go_back()
    page.get_by_role('button',name=re.compile('Stock alerts')).click()
    expect(page.get_by_role('button',name=re.compile('Needs attention'))).to_have_attribute('aria-pressed','true')
    expect(page.locator('tbody tr')).to_have_count(2)
    page.go_back()
    page.get_by_role('button',name=re.compile('Published products')).click()
    expect(page.locator('tbody tr')).to_have_count(2)
    page.get_by_role('button',name='Drafts').click()
    expect(page.locator('tbody tr')).to_have_text(re.compile('Laptop sleeve'))
    page.get_by_role('button',name='Clear filters').click()
    expect(page.locator('tbody tr')).to_have_count(3)
    check_layout('products')
    if width < 760:
        page.get_by_role('button',name='Open navigation').click()
    nav=page.get_by_role('navigation',name='Administrator navigation')
    expect(nav.get_by_role('button',name='Orders',exact=True)).to_be_visible()
    nav.get_by_role('button',name='Orders',exact=True).click()
    expect(page.get_by_role('heading',name='Online shop orders')).to_be_visible()
    print(f'PASS {width}px: staff task queues, history, filters, navigation and page width',flush=True)
