from django.db import models

class SoilTYpe(models.Model):
    name=models.CharField(max_length=50,unique=True)
    descripion=models.TextField()

    def __str__(self):
        return self.name

class Scheme(models.Model):
    name=models.CharField(max_length=300,unique=True)
    description=models.TextField()
    benefits=models.TextField()
    eligibility=models.TextField(blank=True)
    official_link=models.URLField(blank=True)

    def __str__(self):
        return self.name

class Crop(models.Model):
    crop_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    season = models.CharField(max_length=50)
    soil = models.JSONField()
    duration = models.CharField(max_length=100)
    sowing_time = models.CharField(max_length=100)
    climate = models.TextField()
    rainfall = models.CharField(max_length=100)
    fertilizer = models.CharField(max_length=100)
    irrigation = models.TextField()
    yield_info = models.CharField(max_length=100)

    steps = models.JSONField()
    common_mistakes = models.JSONField()
    image = models.ImageField(upload_to="crops/",null=True,blank=True)

    def __str__(self):
        return self.name




# Create your models here.
