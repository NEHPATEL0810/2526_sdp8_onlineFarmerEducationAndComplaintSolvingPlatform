from django.db import models

class SoilTYpe(models.Model):
    name=models.CharField(max_length=50,unique=True)
    descripion=models.TextField()

    def __str__(self):
        return self.name

# Create your models here.
