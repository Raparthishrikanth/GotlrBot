from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView,
    ForgotPasswordView,
    ProfileView,
    AdminUserListView,
    AdminUserDetailView,
    AdminDocumentListView,
    AdminDocumentDeleteView,
    AdminAnalyticsView
)

urlpatterns = [
    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # Admin Management Endpoints
    path('admin/users/', AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/documents/', AdminDocumentListView.as_view(), name='admin_documents'),
    path('admin/documents/<uuid:pk>/', AdminDocumentDeleteView.as_view(), name='admin_document_delete'),
    path('admin/analytics/', AdminAnalyticsView.as_view(), name='admin_analytics'),
]
