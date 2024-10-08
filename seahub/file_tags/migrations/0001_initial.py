# Generated by Django 4.2.2 on 2024-08-27 14:16

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('repo_tags', '0001_initial'),
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='FileTags',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_uuid', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='file_uuid', to='tags.fileuuidmap')),
                ('repo_tag', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='repo_tags.repotags')),
            ],
        ),
    ]
