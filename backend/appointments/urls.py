from rest_framework.routers import SimpleRouter

from .views import AppointmentViewSet

router = SimpleRouter(trailing_slash=False)
router.register("appointments", AppointmentViewSet, basename="appointment")
urlpatterns = router.urls
