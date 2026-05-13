# TONI V44 – RPC-Schema-Cache-Fix für neue Lernreisen

Behebt:
`Could not find the function public.upsert_learning_journey_template_v43(...) in the schema cache`

Ursache:
Supabase/PostgREST hatte die neue RPC-Funktion aus V43 noch nicht im Schema-Cache
oder die Parametersignatur wurde nicht passend erkannt.

Lösung:
- neue Funktion `upsert_learning_journey_template_v44(p_payload jsonb)`
- nur noch ein JSONB-Parameter, dadurch stabilere RPC-Erkennung
- zusätzlich `notify pgrst, 'reload schema';`
- App nutzt die neue Funktion
- falls RPC trotzdem kurzzeitig nicht erreichbar ist, versucht die App einen direkten Fallback

Einrichtung:
1. In Supabase `sql/learning_journey_rpc_schema_cache_fix_v44.sql` ausführen.
2. Kurz 10–20 Sekunden warten.
3. `public/index.html` ersetzen.
4. Neu veröffentlichen.
5. Browser hart neu laden.
6. Neue Lernreise erneut speichern.
