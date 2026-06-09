from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta

from .models import Profile, Document, Chat, Message
from .serializers import (
    RegisterSerializer, 
    UserSerializer, 
    UserAdminSerializer, 
    DocumentAdminSerializer
)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        # In a real app, send email verification link here.
        # We simulate it by returning success.
        return Response({
            "message": f"If an account is associated with {email}, a password reset link has been sent."
        }, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class IsAdminUserOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_staff or 
            (hasattr(request.user, 'profile') and request.user.profile.role == 'admin')
        )


class AdminUserListView(generics.ListAPIView):
    queryset = User.objects.select_related('profile').all().order_by('-date_joined')
    permission_classes = [IsAdminUserOrStaff]
    serializer_class = UserAdminSerializer


class AdminUserDetailView(APIView):
    permission_classes = [IsAdminUserOrStaff]

    def post(self, request, pk):
        # Action: suspend, activate, reset-password
        action = request.data.get('action')
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        if action == 'suspend':
            user.is_active = False
            user.save()
            return Response({"message": f"User {user.username} suspended successfully."})
        elif action == 'activate':
            user.is_active = True
            user.save()
            return Response({"message": f"User {user.username} activated successfully."})
        elif action == 'reset_password':
            new_password = request.data.get('password')
            if not new_password:
                return Response({"error": "New password is required"}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(new_password)
            user.save()
            return Response({"message": f"Password for user {user.username} reset successfully."})
        elif action == 'delete':
            user.delete()
            return Response({"message": "User deleted successfully."})
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)


class AdminDocumentListView(generics.ListAPIView):
    queryset = Document.objects.select_related('user').all().order_by('-upload_date')
    permission_classes = [IsAdminUserOrStaff]
    serializer_class = DocumentAdminSerializer


class AdminDocumentDeleteView(generics.DestroyAPIView):
    queryset = Document.objects.all()
    permission_classes = [IsAdminUserOrStaff]


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdminUserOrStaff]

    def get(self, request):
        total_users = User.objects.count()
        # Active users defined as users active in system or logged in recently
        active_users = User.objects.filter(is_active=True).count()
        total_documents = Document.objects.count()
        total_chats = Chat.objects.count()
        
        # Calculate API usage from Profile count
        total_api_calls = Profile.objects.aggregate(total=Sum('api_usage_count'))['total'] or 0

        # User growth (e.g., users created in the last 7 days)
        last_week = timezone.now() - timedelta(days=7)
        users_last_week = User.objects.filter(date_joined__gte=last_week).count()

        # Document type distribution
        doc_distribution = Document.objects.values('file_type').annotate(count=Count('id'))

        # Build chart data format
        # Simple recent chats counts
        recent_chats = Chat.objects.filter(created_at__gte=last_week).count()
        recent_messages = Message.objects.filter(timestamp__gte=last_week).count()

        data = {
            "metrics": {
                "totalUsers": total_users,
                "activeUsers": active_users,
                "totalDocuments": total_documents,
                "totalChats": total_chats,
                "totalApiCalls": total_api_calls,
                "growthLastWeek": users_last_week
            },
            "documentTypes": list(doc_distribution),
            "activity": {
                "recentChats": recent_chats,
                "recentMessages": recent_messages
            }
        }
        return Response(data, status=status.HTTP_200_OK)
