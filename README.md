# plasmidlab.com

The download site for PlasmidLab and its release files. The app source lives elsewhere.

The app is licensed under the [Terms of Use](https://plasmidlab.com/terms/). Site code and media: see [LICENSE.md](LICENSE.md).

## IndexNow

The key is `6315c8446dfbf8ad0d922177aa3e37b0`, served at https://plasmidlab.com/6315c8446dfbf8ad0d922177aa3e37b0.txt (the file holds only the key). After a push that changes pages, tell Bing, Naver, Yandex and the other IndexNow engines, listing the changed URLs:

```
curl -s -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json; charset=utf-8' -d '{"host":"plasmidlab.com","key":"6315c8446dfbf8ad0d922177aa3e37b0","keyLocation":"https://plasmidlab.com/6315c8446dfbf8ad0d922177aa3e37b0.txt","urlList":["https://plasmidlab.com/","https://plasmidlab.com/tools/translate/"]}'
```

A 200 or 202 reply means it was accepted. Google does not use IndexNow; use Search Console and the sitemap for Google.
