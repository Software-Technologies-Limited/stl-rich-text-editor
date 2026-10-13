# STL Rich Text Editor

STL Rich Text Editor is a standalone rich-text editor for PHP applications. It
contains its own PHP renderer, vanilla JavaScript editor, styles, toolbar,
sanitizer, history, and upload hooks. It does not require CKEditor, KCFinder,
jQuery, npm, Laravel, Yii, Symfony, or any other runtime package.

This project continues the Git history of `2amigos/yii2-ckeditor-widget`, but
version 3 is an independent implementation. It is not CKEditor and is not
affiliated with or endorsed by CKSource or the original maintainers.

## Requirements

- PHP 8.1 through 8.5
- A modern browser

## Installation

```bash
composer require software-technologies-limited/stl-rich-text-editor
```

Copy `vendor/software-technologies-limited/stl-rich-text-editor/src/assets` into
a publicly served directory such as `public/assets/stl-rich-text-editor`.

## Raw PHP

```php
<?php

use Stl\RichTextEditor\Assets;
use Stl\RichTextEditor\Editor;

$assets = new Assets();
$editor = new Editor(
    name: 'content',
    value: $savedHtml,
    preset: 'standard',
    options: ['placeholder' => 'Write something useful…'],
);
?>

<?= $assets->styles() ?>
<?= $editor->render() ?>
<?= $assets->scripts() ?>
<?= $editor->script() ?>
```

The editor synchronizes sanitized HTML into its named `<textarea>`, so ordinary
form submission works without special server integration.

## Presets

- `basic`: undo, redo, bold, italic, links, and clear formatting
- `standard`: headings, formatting, lists, quotes, links, source, and fullscreen
- `full`: standard tools plus code blocks, alignment, images, and tables
- `custom`: only tools supplied through the `toolbar` option

```php
$editor = new Editor(
    name: 'body',
    preset: 'custom',
    options: ['toolbar' => ['bold', 'italic', '|', 'link', 'source']],
);
```

## Image uploads

Set an upload endpoint to replace the image URL prompt with a file picker:

```php
$editor = new Editor(
    name: 'body',
    preset: 'full',
    options: [
        'uploadUrl' => '/uploads/images',
        'uploadField' => 'image',
        'uploadHeaders' => ['X-CSRF-Token' => $csrfToken],
        'uploadData' => ['context' => 'articles'],
    ],
);
```

The endpoint must accept `multipart/form-data` and return `{"url":"/path/image.webp"}`.
Authentication, authorization, MIME inspection, size limits, safe filenames,
storage, and generated URLs remain the application's responsibility.

## Laravel

Construct the objects in a controller, component, or view model and render them
as intentional component HTML in Blade:

```blade
{!! $assets->styles() !!}
{!! $editor->render() !!}
{!! $assets->scripts() !!}
{!! $editor->script() !!}
```

Read the submitted HTML through the ordinary request API.

## Yii

The framework-neutral renderer works directly in a Yii view:

```php
$editor = new \Stl\RichTextEditor\Editor(
    name: 'Post[content]',
    value: (string) $model->content,
    preset: 'full',
);

echo $editor->render();
echo $editor->script();
```

Load `Assets` once in the layout or view. Yii is not installed or required.

## Security

The browser sanitizer removes scripts, event handlers, inline styles, unsafe
URLs, and unsupported elements before form synchronization. Client-side
sanitization is not a security boundary. Applications must sanitize submitted
HTML again on the server using rules appropriate to their threat model.

Upload endpoints must enforce authentication, authorization, MIME inspection,
file-size limits, safe filenames, and non-executable storage.

## Development checks

```bash
composer validate --strict
if composer show --locked --name-only | grep -q .; then composer audit --locked; fi
find src -name '*.php' -print0 | xargs -0 -n1 php -l
node --check src/assets/stl-rich-text-editor.js
```

GitHub Actions runs these checks on PHP 8.1 through 8.5.

## Credits

- Antonio Ramirez, 2amigOS! Consulting Group, and contributors to the original
  Yii CKEditor widget
- Software Technologies Limited, developer and maintainer of the independent
  standalone editor introduced in version 3

## License

BSD-3-Clause. See [LICENSE.md](LICENSE.md). Original notices are retained.
