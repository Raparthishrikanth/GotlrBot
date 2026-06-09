from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Document, Chat, Message

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['role', 'api_usage_count', 'created_at']
        read_only_fields = ['api_usage_count', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True, required=False, default='free_user')

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        role = validated_data.pop('role', 'free_user')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        profile = user.profile
        profile.role = role
        profile.save()
        return user


class DocumentAdminSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'username', 'filename', 'file_type', 'upload_date', 'status']


class UserAdminSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    api_usage_count = serializers.IntegerField(source='profile.api_usage_count', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'role', 'api_usage_count', 'date_joined']
