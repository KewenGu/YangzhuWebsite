# Shop catalog and source artwork

The initial catalog contains two Stripe purchase listings and eight individual design inquiries. Product facts come from the supplied photographs, verified Stripe item names and prices, and the user's confirmation that the two general offerings are prepared according to Taoist rituals and traditions for home enshrinement or daily wear. Text describes traditional cultural meaning without promising personal outcomes.

## Stripe checkout mapping

| Product record | Stripe item | Price | Payment Link |
| --- | --- | --- | --- |
| `peace-protection-talisman` | Taoist Protection & Peace Talisman | US$268 | https://buy.stripe.com/cNi3cwckN6dWfgY6Hgew800 |
| `evil-warding-protection-pendant` | Taoist Evil-Warding & Protection Pendant | US$68 | https://buy.stripe.com/eVqaEYfwZ31K3ygc1Aew801 |

The names, prices and Yangzhu merchant identity were checked on the Stripe pages during implementation on October 18, 2026; the user also supplied the matching item descriptions. These links are attached only to the general purchase listings. They do not establish availability, pricing or a selectable variant for each pictured design. Confirm the desired design with the customer before payment when it is not selectable on Stripe.

After changing prices, availability or Stripe configuration, update the product JSON or CMS fields to match. `checkout_verified` means the merchant has checked the linked item, not that the build contacts Stripe. Confirm actual availability before keeping `in_stock`.

## Image inventory

All 11 photographs were supplied by the user for the shop. Their frames, visible lettering and watermarks are preserved. Public JPEGs have a maximum edge of 1,920 pixels. Each also has a 640-pixel `-thumb.jpg` sibling for catalog listings.

| Source attachment | Public asset | Use |
| --- | --- | --- |
| 1 | `assets/shop/calligraphy-presentation-1.jpg` | Cultural exchange photograph; credit retained |
| 2 | `assets/shop/calligraphy-presentation-2.jpg` | Cultural exchange photograph; credit retained |
| 3 | `assets/shop/zhao-gongming-tiger-pendant.jpg` | Zhao Gongming and tiger design |
| 4 | `assets/shop/zhao-gongming-seated-pendant.jpg` | Seated Zhao Gongming design |
| 5 | `assets/shop/thunder-ancestor-pendant.jpg` | Double-sided Thunder Ancestor design |
| 6 | `assets/shop/wenchang-pendant.jpg` | Wenchang Dijun design |
| 7 | `assets/shop/ziwei-inscription-pendant.jpg` | Ziwei sacred inscription design |
| 8 | `assets/shop/taoist-calligraphy-horizontal.jpg` | Horizontal talisman work |
| 9 | `assets/shop/jingming-jing-pendant.jpg` | Jingming Jing-symbol design |
| 10 | `assets/shop/taoist-calligraphy-scroll.jpg` | Vertical talisman scroll |
| 11 | `assets/shop/calligraphy-collection.jpg` | Shop hero: scrolls displayed at Yangzhu |

The two event photographs show cultural exchange settings. They are not customer endorsements and do not imply that the depicted people recommend a product. The double-sided photograph illustrates two views; it does not establish a two-item package.

## Catalog facts to confirm

The individual design listings intentionally have no guessed prices or purchase links. Confirm their materials, dimensions, exact contents, availability, delivery terms and any religious preparation before adding those claims. A red inscription does not verify cinnabar content. A photograph cannot verify an object's production method, age or consecration.

The catalog uses distinct Chinese and English titles, summaries, descriptions, factual detail rows, image alt text and visible FAQs. Keep those details consistent with the actual item and Stripe checkout when editing. Avoid adding unverified reviews, ratings, measurements, shipping promises or supernatural outcomes to either visible content or structured metadata.

## AI artwork example and review result

Built-in ImageGen was used with the original Jingming photograph as the edit reference. The output is saved at [shop-artwork-drafts/jingming-detail-ai-draft.jpg](shop-artwork-drafts/jingming-detail-ai-draft.jpg), outside the deployed assets directory.

**Review result: rejected for use as a product-detail photograph.** Although the board retained an original-style panel and was labeled as AI-assisted, the enlarged symbol and border were redrawn and the enlarged panel did not preserve the source watermark. It is an internal draft demonstrating why an AI-generated close-up needs review. It is not referenced by any catalog listing or production page.

For factual close-ups, use the original image at full resolution or a deterministic crop. For AI-created backgrounds or compositions, preserve the photographed object and its marks, label generated artwork, and inspect it before publication. Never use a generated image to establish an unseen back view, material, dimension or new feature.

### Generation prompt

> Use case: precise-object-edit / product-mockup. Asset type: faithful product-detail board for Yangzhu online shop, illustrative AI-assisted secondary image, never the primary product photograph. Input image is the exact edit target, a Jingming pendant photograph. Create a refined wide editorial detail composition on warm ivory paper: keep the entire original photograph as one intact rectangular panel at left, and at right show one large magnified detail of the pendant's existing central carved Jing glyph and its lower scroll border. Preserve the exact object shape, carved glyph strokes, decorative contours, brown color, black cord, and all original Yangzhu association watermark marks wherever present in source. Do not remove or obscure the watermark. Preserve original source photo text in the intact left panel. Add only small neutral sans-serif caption 'DETAIL STUDY' above right detail and 'AI-assisted illustration · See original photos for product details' along the bottom. Do not invent material, size, provenance, religious effects, new engravings, or new carvings. The right image must be a faithful magnification rather than redesign. Soft natural contrast, quiet museum catalog style, generous negative space, clean fine gold rules, no extra decoration, no invented brand marks. Output landscape 3:2.
