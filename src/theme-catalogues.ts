import type {DesignTheme} from './store-themes';

type ItemSpec = readonly [id:string,name:string,category:string,price:number,detail:string,use:string];
export type DemoItem = {id:string; name:string; detail:string; category:string; price:number; use:string; image:string};
export type ThemeCatalogue = {heading:string; intro:string; items:readonly DemoItem[]};

function catalogue(folder:string,heading:string,intro:string,entries:readonly ItemSpec[]):ThemeCatalogue {
 return {heading,intro,items:entries.map(([id,name,category,price,detail,use])=>({
  id,name,category,price,detail,use,image:'/images/themes/catalogue/'+folder+'/'+id+'.webp',
 }))};
}

export const themeCatalogues:Partial<Record<DesignTheme['id'],ThemeCatalogue>> = {
 'warm-editorial':catalogue('spa','The evening edit','Start with a cleanse, add a face oil, or put together a small gift for someone who needs an hour to themselves.',[
  ['evening-face-oil','Evening face oil','Face',690,'A silky oil for the last step of your evening routine.','Warm a few drops between your fingertips and press gently onto clean skin.'],
  ['silk-cleansing-balm','Silk cleansing balm','Cleansing',480,'A soft balm that turns into a milk when rinsed.','Massage onto dry skin, add water and rinse before applying your moisturiser.'],
  ['body-ritual-set','Body ritual set','Body',1140,'Body oil and a soft cloth, packed together for gifting.','Use the cloth in a warm shower and apply the oil to damp skin afterwards.'],
  ['botanical-face-mist','Botanical face mist','Face',390,'A fine mist in a refillable frosted bottle.','Mist onto clean skin between cleansing and moisturising, avoiding the eyes.'],
  ['cloud-face-cream','Cloud face cream','Face',560,'An everyday cream with a soft, whipped texture.','Smooth a small amount over clean skin as the final cream step.'],
  ['gentle-gel-cleanser','Gentle gel cleanser','Cleansing',450,'A light gel with an easy-rinse texture.','Massage onto damp skin and rinse with lukewarm water.'],
  ['mineral-clay-mask','Mineral clay mask','Face',520,'A creamy wash-off clay mask for a weekly ritual.','Apply a thin layer, follow the on-pack timing and rinse before moisturising.'],
  ['shea-lip-balm','Shea lip balm','Face',180,'A pocket-sized balm with a satin finish.','Apply a light layer when your lips feel dry.'],
  ['mineral-bath-soak','Mineral bath soak','Body',420,'Coarse bath salts in a glass jar.','Dissolve a small amount in warm bathwater and rinse the tub after use.'],
  ['linen-face-cloth','Linen face cloth','Accessories',240,'A softly woven cloth with a hanging loop.','Use with warm water and hang the cloth to dry between uses.'],
  ['jade-massage-stone','Jade massage stone','Accessories',380,'A smooth facial tool with a curved edge.','Use gentle strokes over an oiled face and clean the stone after each use.'],
  ['serein-gift-box','Serein gift box','Gift sets',1490,'A wrapped edit of studio essentials for an evening in.','Choose this bundle to try several steps of the evening edit together.'],
 ]),
 'clean-premium-retail':catalogue('retail','The everyday collection','Pick the essentials for your commute, your desk or the bag that goes everywhere.',[
  ['usb-c-charger','Everyday USB-C charger','Power',549,'Compact 30 W power and a two-round-pin plug.','Keep a compact spare at your desk or in your work bag.'],
  ['wireless-headphones','Wireless headphones','Audio',899,'Over-ear fit and simple wireless pairing.','Pair them with a laptop for calls or your phone for the commute.'],
  ['foldable-laptop-stand','Foldable laptop stand','Desk accessories',479,'A pair of folding supports for a clearer desk.','Raise your laptop to a comfortable height and fold the stand away when you pack up.'],
  ['portable-power-bank','Portable power bank','Power',749,'A slim USB-C battery in a muted sage finish.','Keep it in a small pouch for top-ups away from a wall socket.'],
  ['woven-usb-c-cable','Woven USB-C cable','Power',199,'A flexible braided cable with USB-C at both ends.','Pair it with a compatible charger, power bank or laptop port.'],
  ['pocket-bluetooth-speaker','Pocket Bluetooth speaker','Audio',679,'A compact fabric-covered speaker for a small room.','Connect from your phone and move it easily between a shelf and a desk.'],
  ['commuter-earbuds','Commuter earbuds','Audio',1099,'Compact earbuds with an ivory charging case.','Use the case to keep the earbuds together when travelling.'],
  ['zip-laptop-sleeve','Zip laptop sleeve','Carry',399,'Soft-lined cover for up to a 14-inch notebook.','Slide it into a tote or backpack and use the zip closure to keep your laptop secure.'],
  ['usb-c-desk-hub','USB-C desk hub','Desk accessories',799,'A compact hub with room for everyday desk connections.','Connect compatible accessories to one hub before plugging into your laptop.'],
  ['compact-keyboard','Compact wireless keyboard','Desk accessories',849,'A low-profile keyboard that saves desk space.','Set it below a raised display for a cleaner workspace.'],
  ['wireless-mouse','Wireless mouse','Desk accessories',379,'A rounded grey mouse with a slim travel profile.','Pair it with your compatible computer and keep it close on crowded desks.'],
  ['leather-desk-mat','Leather desk mat','Desk accessories',649,'A warm brown desk mat with a stitched edge.','Use it to define a comfortable working area for a keyboard and mouse.'],
 ]),
 'product-showcase':catalogue('audio','Build your listening setup','Start with the way you listen, then choose the headphones, case and accessories that fit.',[
  ['studio-wireless','Studio Wireless','Headphones',2890,'Closed-back headphones with soft ear cushions.','Switch from wireless listening on the move to a wired connection at your desk.'],
  ['studio-wireless-ivory','Studio Wireless Ivory','Headphones',2890,'Our flagship over-ear design in a soft ivory finish.','Choose the lighter finish with the same simple wireless and wired setup.'],
  ['reference-wired','Reference Wired','Headphones',2390,'Wired over-ear headphones in brushed silver and black.','Use a compatible headphone output for an at-desk listening setup.'],
  ['room-pocket-speaker','Room Pocket speaker','Speakers',1650,'A portable speaker with a compact cloth-wrapped body.','Move it between a bookshelf and a side table as you listen.'],
  ['commute-earbuds','Commute earbuds','Earbuds',1590,'A pocket charging case and easy wireless pairing.','Use these for days when you want a lighter option than over-ear headphones.'],
  ['hard-travel-case','Hard travel case','Care and carry',420,'A rigid midnight-blue case with a soft lining.','Pack compatible headphones before placing them in a travel bag.'],
  ['soft-ear-cushions','Soft ear cushions','Care and carry',390,'A pair of oval replacement pads for compatible Studio models.','Use the compatibility guide before changing the existing cushions on your headphones.'],
  ['braided-listening-cable','Braided listening cable','Connections',270,'A flexible cable with a 3.5 mm plug at each end.','Connect compatible Studio headphones to a supported audio output.'],
  ['aluminium-stand','Aluminium headphone stand','Desk setup',650,'A machined stand with a gently curved resting surface.','Keep over-ear headphones within reach when you are away from your desk.'],
  ['usb-c-audio-adapter','USB-C audio adapter','Connections',320,'A pocket adapter with a 3.5 mm headphone output.','Check that your phone or laptop supports USB-C audio before connecting.'],
  ['cable-organiser','Audio cable organiser','Care and carry',260,'A compact fabric pouch for cables and adapters.','Separate cables from the rest of your bag with the zipped pouch.'],
  ['studio-desk-set','Studio desk set','Desk setup',3350,'Studio Wireless and the aluminium stand in one set.','Choose the bundle when setting up a dedicated listening spot at home.'],
 ]),
};
