# Generated by Django 4.2.2 on 2024-08-27 14:16

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import seahub.base.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientLoginToken',
            fields=[
                ('token', models.CharField(max_length=32, primary_key=True, serialize=False)),
                ('username', models.CharField(db_index=True, max_length=255)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
        migrations.CreateModel(
            name='ClientSSOToken',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(max_length=100, unique=True)),
                ('username', seahub.base.fields.LowerCaseCharField(blank=True, db_index=True, max_length=255, null=True)),
                ('status', models.CharField(choices=[('waiting', 'waiting'), ('success', 'success'), ('error', 'error')], default='waiting', max_length=10)),
                ('api_key', models.CharField(blank=True, max_length=40, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(blank=True, db_index=True, null=True)),
                ('accessed_at', models.DateTimeField(blank=True, db_index=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='CommandsLastCheck',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('command_type', models.CharField(max_length=100)),
                ('last_check', models.DateTimeField()),
            ],
        ),
        migrations.CreateModel(
            name='RepoSecretKey',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('repo_id', models.CharField(db_index=True, max_length=36, unique=True)),
                ('secret_key', models.CharField(max_length=44)),
            ],
        ),
        migrations.CreateModel(
            name='UserLastLogin',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(db_index=True, max_length=255)),
                ('last_login', models.DateTimeField(default=django.utils.timezone.now)),
            ],
        ),
        migrations.CreateModel(
            name='UserStarredFiles',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('org_id', models.IntegerField()),
                ('repo_id', models.CharField(db_index=True, max_length=36)),
                ('path', models.TextField()),
                ('is_dir', models.BooleanField()),
            ],
        ),
        migrations.CreateModel(
            name='UserMonitoredRepos',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(db_index=True, max_length=254)),
                ('repo_id', models.CharField(db_index=True, max_length=36)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'unique_together': {('email', 'repo_id')},
            },
        ),
        migrations.CreateModel(
            name='SocialAuthUser',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(db_index=True, max_length=255)),
                ('provider', models.CharField(max_length=32)),
                ('uid', models.CharField(max_length=255)),
                ('extra_data', models.TextField(null=True)),
            ],
            options={
                'db_table': 'social_auth_usersocialauth',
                'unique_together': {('provider', 'uid')},
            },
        ),
        migrations.CreateModel(
            name='FileComment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author', seahub.base.fields.LowerCaseCharField(db_index=True, max_length=255)),
                ('comment', models.TextField()),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('resolved', models.BooleanField(db_index=True, default=False)),
                ('detail', models.TextField(default='')),
                ('uuid', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='tags.fileuuidmap')),
            ],
        ),
        migrations.CreateModel(
            name='ExternalDepartment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('group_id', models.IntegerField(unique=True)),
                ('provider', models.CharField(max_length=32)),
                ('outer_id', models.BigIntegerField()),
            ],
            options={
                'db_table': 'external_department',
                'unique_together': {('provider', 'outer_id')},
            },
        ),
        migrations.CreateModel(
            name='DeviceToken',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(max_length=80)),
                ('user', seahub.base.fields.LowerCaseCharField(max_length=255)),
                ('platform', seahub.base.fields.LowerCaseCharField(max_length=32)),
                ('version', seahub.base.fields.LowerCaseCharField(max_length=16)),
                ('pversion', seahub.base.fields.LowerCaseCharField(max_length=16)),
            ],
            options={
                'unique_together': {('token', 'user')},
            },
        ),
    ]
