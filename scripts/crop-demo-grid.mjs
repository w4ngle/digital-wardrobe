import sharp from 'sharp'

const source = 'public/demo-items/generated-catalog-30.png'
const names = [
  'red-turtleneck', 'white-cropped-blouse', 'black-satin-camisole', 'striped-longsleeve', 'beige-hoodie',
  'dark-blue-jeans', 'cream-wide-trousers', 'burgundy-mini-skirt', 'olive-cargo-pants', 'gray-sport-leggings',
  'white-ankle-boots', 'red-ballet-flats', 'beige-chunky-sneakers', 'black-tall-boots', 'brown-heeled-boots',
  'navy-blazer', 'cream-cropped-jacket', 'olive-parka', 'burgundy-wool-coat', 'blue-denim-jacket',
  'red-shoulder-bag', 'black-tote', 'cream-crossbody', 'silver-clutch', 'brown-backpack',
  'black-wide-belt', 'cream-knit-scarf', 'burgundy-beanie', 'gold-necklace', 'dark-sunglasses',
]
const columns = [0, 250, 470, 688, 920, 1145]
const rows = [0, 260, 547, 764, 1006, 1209, 1374]
const inset = 3

await Promise.all(names.map((name, index) => sharp(source)
  .extract({
    left: columns[index % 5] + inset,
    top: rows[Math.floor(index / 5)] + inset,
    width: columns[index % 5 + 1] - columns[index % 5] - inset * 2,
    height: rows[Math.floor(index / 5) + 1] - rows[Math.floor(index / 5)] - inset * 2,
  })
  .png()
  .toFile(`public/demo-items/generated-${name}.png`)))

console.log(`Готово: корректно вырезано ${names.length} изображений`)
