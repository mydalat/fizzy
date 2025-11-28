# Fizzy

This is the source code of [Fizzy](https://fizzy.do/), the Kanban tracking tool for issues and ideas by [37signals](https://37signals.com).

## Development

### Setting up

First, get everything installed and configured with:

```sh
bin/setup
bin/setup --reset # Reset the database and seed it
```

And then run the development server:

```sh
bin/dev
```

You'll be able to access the app in development at http://fizzy.localhost:3006.

To login, enter `david@37signals.com` and grab the verification code from the browser console to sign in.

### Running tests

For fast feedback loops, unit tests can be run with:

    bin/rails test

The full continuous integration tests can be run with:

    bin/ci

### Database configuration

Fizzy supports SQLite (default, recommended for most scenarios) and MySQL. You can switch adapters with the `DATABASE_ADAPTER` environment variable.

```sh
DATABASE_ADAPTER=mysql bin/rails
```

### Outbound Emails

You can view email previews at http://fizzy.localhost:3006/rails/mailers.

You can enable or disable [`letter_opener`](https://github.com/ryanb/letter_opener) to open sent emails automatically with:

    bin/rails dev:email

Under the hood, this will create or remove `tmp/email-dev.txt`.

## Deployment

We recommend [Kamal](https://kamal-deploy.org/) for deploying Fizzy. This project comes with a vanilla Rails template, you can find our production setup in [`fizzy-saas`](https://github.com/basecamp/fizzy-saas).

## SaaS gem companion

37signals bundles Fizzy with [`fizzy-saas`](https://github.com/basecamp/fizzy-saas), a companion gem that links Fizzy with our billing system and provides our production database and deployment setup.

## License

Fizzy is released under the [O'Saasy License](LICENSE.md).
