from rest_framework.routers import SimpleRouter

from .views import PredictionViewSet

router = SimpleRouter(trailing_slash=False)
router.register("predictions", PredictionViewSet, basename="prediction")
urlpatterns = router.urls
