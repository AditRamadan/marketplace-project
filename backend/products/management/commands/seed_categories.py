from django.core.management.base import BaseCommand
from django.utils.text import slugify
from products.models import Category

class Command(BaseCommand):
    help = 'Menambahkan kategori awal untuk marketplace'

    def handle(self, *args, **kwargs):
        categories = ['Elektronik', 'Pakaian & Fashion', 'Makanan & Minuman', 'Kesehatan', 'Hobi & Mainan']
        for cat_name in categories:
            Category.objects.get_or_create(
                name=cat_name,
                defaults={'slug': slugify(cat_name)}
            )
        self.stdout.write(self.style.SUCCESS('Kategori berhasil ditambahkan!'))