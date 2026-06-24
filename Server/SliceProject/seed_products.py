"""
Seed script: creates seller 'Shahil' and 15 products with images.
Run:  python manage.py shell < seed_products.py
"""
import os, sys, django, shutil

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SliceProject.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.core.files import File
from products.models import Product

User = get_user_model()

# ── 1. Create or get seller ──────────────────────────────────
username = 'Shahil'
password = 'shahil@123'

seller, created = User.objects.get_or_create(
    username=username,
    defaults={
        'email': 'shahil@slicebuy.com',
        'is_seller': True,
    },
)
if created:
    seller.set_password(password)
    seller.save()
    print(f'✅  Created seller: {username}')
else:
    # ensure is_seller flag
    if not seller.is_seller:
        seller.is_seller = True
        seller.save()
    print(f'ℹ️  Seller "{username}" already exists')

# ── 2. Product data ──────────────────────────────────────────
IMG_DIR = r'C:\Users\shahi\.gemini\antigravity\brain\11c33ee9-2a9e-4bd8-aa44-5d24d78af931'

products_data = [
    {
        'name': 'Premium Leather Messenger Bag',
        'description': 'Handcrafted full-grain leather messenger bag with antique brass hardware. Features a padded laptop sleeve, multiple pockets, and an adjustable shoulder strap. Perfect for work or travel.',
        'price': 4999.00,
        'stock': 25,
        'image': 'leather_bag_1775500384074.png',
    },
    {
        'name': 'ProSound Wireless Headphones',
        'description': 'Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and Hi-Res Audio support. Ultra-comfortable memory foam ear cushions.',
        'price': 3499.00,
        'stock': 40,
        'image': 'wireless_headphones_1775500400625.png',
    },
    {
        'name': 'Artisan Ceramic Coffee Mug',
        'description': 'Beautifully handmade ceramic mug with a unique blue reactive glaze finish. Microwave and dishwasher safe. Each piece is one-of-a-kind. 350ml capacity.',
        'price': 699.00,
        'stock': 60,
        'image': 'ceramic_mug_1775500416640.png',
    },
    {
        'name': 'AeroStride Running Shoes',
        'description': 'Lightweight performance running shoes with responsive foam cushioning and breathable mesh upper. Features a durable rubber outsole for excellent grip on any surface.',
        'price': 5999.00,
        'stock': 30,
        'image': 'running_shoes_1775500433410.png',
    },
    {
        'name': 'Minimalist Wooden Watch',
        'description': 'Elegant wristwatch crafted from sustainable walnut wood with a genuine leather strap. Japanese quartz movement. Water-resistant to 3 ATM. Comes in a gift box.',
        'price': 2499.00,
        'stock': 20,
        'image': 'wooden_watch_1775500449004.png',
    },
    {
        'name': 'Geometric Succulent Planter',
        'description': 'Modern geometric concrete planter pot, perfect for succulents and small cacti. Includes drainage hole and bamboo tray. Hand-poured and polished.',
        'price': 449.00,
        'stock': 50,
        'image': 'succulent_planter_1775500470047.png',
    },
    {
        'name': 'Lavender Soy Wax Candle',
        'description': 'Luxury hand-poured soy wax candle in an amber glass jar. Infused with natural lavender essential oils for a calming aroma. Burns for up to 45 hours.',
        'price': 599.00,
        'stock': 80,
        'image': 'scented_candle_1775500487119.png',
    },
    {
        'name': 'ErgoLift Laptop Stand',
        'description': 'Premium aluminum laptop stand with ergonomic 15° tilt angle. Compatible with all laptops up to 17 inches. Improves posture and airflow. Anti-slip silicone pads.',
        'price': 1999.00,
        'stock': 35,
        'image': 'laptop_stand_1775500503538.png',
    },
    {
        'name': 'Botanical Phone Case',
        'description': 'Stylish slim-fit phone case featuring a beautiful botanical floral pattern. Made from durable TPU with raised edges for screen and camera protection.',
        'price': 399.00,
        'stock': 100,
        'image': 'phone_case_1775500520244.png',
    },
    {
        'name': 'Explorer Canvas Backpack',
        'description': 'Durable canvas backpack with genuine leather accents. Features a padded laptop compartment, water bottle pockets, and a hidden anti-theft pocket. 30L capacity.',
        'price': 3299.00,
        'stock': 22,
        'image': 'backpack_1775500539064.png',
    },
    {
        'name': 'Classic Aviator Sunglasses',
        'description': 'Timeless aviator sunglasses with gold metal frame and polarized UV400 lenses. Comes with a premium leather case and cleaning cloth. Unisex design.',
        'price': 1499.00,
        'stock': 45,
        'image': 'sunglasses_1775500564533.png',
    },
    {
        'name': 'Flex LED Desk Lamp',
        'description': 'Modern LED desk lamp with 5 brightness levels and 3 color temperatures. Features a flexible gooseneck arm, USB charging port, and touch controls. Eye-care technology.',
        'price': 1799.00,
        'stock': 28,
        'image': 'desk_lamp_1775500582149.png',
    },
    {
        'name': 'ProFlex Yoga Mat',
        'description': 'Premium 6mm thick yoga mat with non-slip textured surface. Made from eco-friendly TPE material. Includes a carrying strap. Perfect for yoga, pilates, and stretching.',
        'price': 1299.00,
        'stock': 55,
        'image': 'yoga_mat_1775500597339.png',
    },
    {
        'name': 'Slim Leather Wallet',
        'description': 'Minimalist bifold wallet crafted from full-grain leather. Features RFID-blocking technology, 6 card slots, and a cash compartment. Fits comfortably in front pockets.',
        'price': 999.00,
        'stock': 70,
        'image': 'wallet_1775500613535.png',
    },
    {
        'name': 'SoundWave Bluetooth Speaker',
        'description': 'Portable Bluetooth 5.3 speaker with 360° immersive sound. IPX7 waterproof rating, 20-hour battery life, and built-in microphone. Perfect for outdoor adventures.',
        'price': 2799.00,
        'stock': 32,
        'image': 'bluetooth_speaker_1775500629883.png',
    },
]

# ── 3. Create products ───────────────────────────────────────
created_count = 0
for p in products_data:
    if Product.objects.filter(name=p['name'], seller=seller).exists():
        print(f'  ⏭️  Skipped (exists): {p["name"]}')
        continue

    img_path = os.path.join(IMG_DIR, p['image'])
    product = Product(
        seller=seller,
        name=p['name'],
        description=p['description'],
        price=p['price'],
        stock=p['stock'],
    )

    if os.path.exists(img_path):
        with open(img_path, 'rb') as f:
            product.image.save(p['image'], File(f), save=False)

    product.save()
    created_count += 1
    print(f'  ✅  {p["name"]}  —  ₹{p["price"]:,.0f}')

print(f'\n🎉  Done! Created {created_count} products for seller "{username}".')
