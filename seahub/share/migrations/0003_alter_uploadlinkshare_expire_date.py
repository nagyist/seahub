# Generated by Django 4.2.2 on 2024-06-12 10:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('share', '0002_customsharepermissions_alter_fileshare_permission_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='uploadlinkshare',
            name='expire_date',
            field=models.DateTimeField(db_index=True, null=True),
        ),
    ]
