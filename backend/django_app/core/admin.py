from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Profile, Document, DocumentChunk, Chat, Message

# Set "View Site" link to route directly to React Frontend
admin.site.site_url = 'http://localhost:5173'

# Define custom action to suspend users in bulk
@admin.action(description="Suspend selected user accounts")
def suspend_users(modeladmin, request, queryset):
    queryset.update(is_active=False)

@admin.action(description="Activate selected user accounts")
def activate_users(modeladmin, request, queryset):
    queryset.update(is_active=True)


# Inline admin to display Profile info directly inside User admin
class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = "SaaS Profile"


class UserAdmin(BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff', 'profile__role')
    actions = [suspend_users, activate_users]

    def get_role(self, obj):
        return obj.profile.role
    get_role.short_description = 'Role'

# Re-register UserAdmin with the profile inline
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'api_usage_count', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('user__username', 'user__email')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('filename', 'user', 'file_type', 'status', 'upload_date')
    list_filter = ('file_type', 'status', 'upload_date')
    search_fields = ('filename', 'user__username', 'user__email')
    ordering = ('-upload_date',)


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_filename', 'get_user')
    search_fields = ('chunk_text', 'document__filename')

    def get_filename(self, obj):
        return obj.document.filename
    get_filename.short_description = 'Filename'

    def get_user(self, obj):
        return obj.document.user.username
    get_user.short_description = 'User'


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('sender', 'content', 'timestamp', 'sources')


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'created_at')
    search_fields = ('title', 'user__username')
    list_filter = ('created_at',)
    inlines = [MessageInline]
    ordering = ('-created_at',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'get_chat_title', 'get_user', 'timestamp')
    list_filter = ('sender', 'timestamp')
    search_fields = ('content', 'chat__title', 'chat__user__username')
    ordering = ('-timestamp',)

    def get_chat_title(self, obj):
        return obj.chat.title
    get_chat_title.short_description = 'Chat Title'

    def get_user(self, obj):
        return obj.chat.user.username
    get_user.short_description = 'User'
