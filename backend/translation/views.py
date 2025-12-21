from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from googletrans import Translator
import json
translator = Translator()

@csrf_exempt
def translate_text(request):
    if request.method == "POST":
        body = json.loads(request.body)
        text = body.get("text")
        source = body.get("source_lang")
        target = body.get("target_lang")
        
        translated = translator.translate(
            text,
            src=source,
            dest=target
        )
       
    return JsonResponse({
           "translatedText":translated.text
       })