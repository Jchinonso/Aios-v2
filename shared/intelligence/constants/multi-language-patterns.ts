/**
 * Multi-Language Detection Patterns - Comprehensive language and framework support
 *
 * Following SOLID Principles:
 * - SRP: Single responsibility for multi-language pattern definitions
 * - OCP: Open for extension through new language patterns
 */

// Comprehensive Language File Extensions
export const LANGUAGE_EXTENSIONS = {
  // JavaScript/TypeScript Ecosystem
  JAVASCRIPT: ['.js', '.mjs', '.cjs'],
  TYPESCRIPT: ['.ts', '.tsx', '.d.ts'],
  JSX: ['.jsx'],

  // Python Ecosystem
  PYTHON: ['.py', '.pyx', '.pyi', '.pyw', '.pyc', '.pyo'],

  // Java Ecosystem
  JAVA: ['.java', '.class', '.jar', '.war', '.ear'],
  KOTLIN: ['.kt', '.kts'],
  SCALA: ['.scala', '.sc'],
  GROOVY: ['.groovy', '.gvy', '.gy', '.gsh'],

  // .NET Ecosystem
  CSHARP: ['.cs', '.csx'],
  FSHARP: ['.fs', '.fsx', '.fsi'],
  VB_NET: ['.vb'],

  // Native Languages
  C: ['.c', '.h'],
  CPP: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh'],
  RUST: ['.rs'],
  GO: ['.go'],

  // Web Languages
  PHP: ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'],
  RUBY: ['.rb', '.rbw', '.rake', '.gemspec'],

  // Functional Languages
  HASKELL: ['.hs', '.lhs'],
  ELIXIR: ['.ex', '.exs'],
  ERLANG: ['.erl', '.hrl'],
  CLOJURE: ['.clj', '.cljs', '.cljc', '.edn'],

  // Other Popular Languages
  SWIFT: ['.swift'],
  DART: ['.dart'],
  LUA: ['.lua'],
  PERL: ['.pl', '.pm', '.t', '.pod'],
  SHELL: ['.sh', '.bash', '.zsh', '.fish'],
  POWERSHELL: ['.ps1', '.psm1', '.psd1'],

  // Data & Config Languages
  SQL: ['.sql'],
  YAML: ['.yaml', '.yml'],
  JSON: ['.json', '.jsonc'],
  XML: ['.xml', '.xsd', '.xsl', '.xslt'],
  TOML: ['.toml'],
  INI: ['.ini', '.cfg', '.conf'],

  // Markup Languages
  HTML: ['.html', '.htm', '.xhtml'],
  CSS: ['.css', '.scss', '.sass', '.less', '.stylus'],
  MARKDOWN: ['.md', '.markdown', '.mdown', '.mkd']
} as const;

// Package Manager Files
export const PACKAGE_FILES = {
  // JavaScript/TypeScript
  NPM: ['package.json', 'package-lock.json', '.npmrc'],
  YARN: ['yarn.lock', '.yarnrc', '.yarnrc.yml'],
  PNPM: ['pnpm-lock.yaml', '.pnpmfile.cjs', 'pnpm-workspace.yaml'],
  BUN: ['bun.lockb'],

  // Python
  PIP: ['requirements.txt', 'requirements-dev.txt', 'requirements-test.txt'],
  PIPENV: ['Pipfile', 'Pipfile.lock'],
  POETRY: ['pyproject.toml', 'poetry.lock'],
  CONDA: ['environment.yml', 'environment.yaml', 'conda-environment.yml'],
  SETUP_PY: ['setup.py', 'setup.cfg'],

  // Java
  MAVEN: ['pom.xml'],
  GRADLE: ['build.gradle', 'build.gradle.kts', 'gradle.properties', 'settings.gradle'],
  SBT: ['build.sbt', 'project/build.properties'],

  // .NET
  NUGET: ['packages.config', 'packages.lock.json'],
  DOTNET: ['.csproj', '.fsproj', '.vbproj', '.sln', 'Directory.Build.props', 'global.json'],

  // Go
  GO_MODULES: ['go.mod', 'go.sum', 'go.work'],

  // Rust
  CARGO: ['Cargo.toml', 'Cargo.lock'],

  // PHP
  COMPOSER: ['composer.json', 'composer.lock'],

  // Ruby
  BUNDLER: ['Gemfile', 'Gemfile.lock', '.gemspec'],

  // Swift
  SWIFT_PM: ['Package.swift'],
  COCOAPODS: ['Podfile', 'Podfile.lock'],
  CARTHAGE: ['Cartfile', 'Cartfile.resolved'],

  // Others
  DART_PUB: ['pubspec.yaml', 'pubspec.lock'],
  FLUTTER: ['pubspec.yaml'],
  ELIXIR_MIX: ['mix.exs', 'mix.lock']
} as const;

// Framework Detection Patterns by Language
export const FRAMEWORK_PATTERNS = {
  // JavaScript/TypeScript Frameworks
  REACT: {
    dependencies: ['react', '@types/react', 'react-dom', '@types/react-dom'],
    files: ['src/App.jsx', 'src/App.tsx', 'src/index.js', 'public/index.html'],
    patterns: ['import React', 'from "react"', 'JSX.Element']
  },

  VUE: {
    dependencies: ['vue', '@vue/cli', 'nuxt', '@nuxt/'],
    files: ['src/App.vue', 'nuxt.config.js', 'vue.config.js'],
    patterns: ['<template>', '<script setup>', 'Vue.createApp']
  },

  ANGULAR: {
    dependencies: ['@angular/core', '@angular/cli', '@angular/common'],
    files: ['angular.json', 'src/app/app.module.ts', 'src/main.ts'],
    patterns: ['@Component', '@NgModule', '@Injectable']
  },

  SVELTE: {
    dependencies: ['svelte', '@sveltejs/kit', 'vite'],
    files: ['svelte.config.js', 'src/app.html'],
    patterns: ['<script>', '<style>', 'export let']
  },

  // Node.js Backend Frameworks
  EXPRESS: {
    dependencies: ['express', '@types/express'],
    patterns: ['app.listen', 'express()', 'app.use', 'app.get']
  },

  NESTJS: {
    dependencies: ['@nestjs/core', '@nestjs/common'],
    patterns: ['@Controller', '@Injectable', '@Module', 'NestFactory']
  },

  FASTIFY: {
    dependencies: ['fastify'],
    patterns: ['fastify()', 'server.listen', 'fastify.register']
  },

  // Python Frameworks
  DJANGO: {
    dependencies: ['Django', 'django'],
    files: ['manage.py', 'settings.py', 'urls.py', 'wsgi.py'],
    patterns: ['from django', 'INSTALLED_APPS', 'urlpatterns', 'Django']
  },

  FLASK: {
    dependencies: ['Flask', 'flask'],
    patterns: ['from flask', 'Flask(__name__)', '@app.route', 'app.run']
  },

  FASTAPI: {
    dependencies: ['fastapi', 'uvicorn'],
    patterns: ['from fastapi', 'FastAPI()', '@app.get', '@app.post']
  },

  STREAMLIT: {
    dependencies: ['streamlit'],
    patterns: ['import streamlit', 'st.write', 'st.sidebar']
  },

  // Java Frameworks
  SPRING: {
    dependencies: ['spring-boot-starter', 'spring-framework', 'spring-core'],
    files: ['application.properties', 'application.yml'],
    patterns: ['@SpringBootApplication', '@RestController', '@Service', '@Component']
  },

  STRUTS: {
    dependencies: ['struts2-core', 'struts-core'],
    files: ['struts.xml', 'struts-config.xml'],
    patterns: ['extends ActionSupport', 'struts.xml']
  },

  HIBERNATE: {
    dependencies: ['hibernate-core', 'hibernate-entitymanager'],
    patterns: ['@Entity', '@Table', '@Column', 'SessionFactory']
  },

  // .NET Frameworks
  ASP_NET: {
    files: ['Startup.cs', 'Program.cs', 'appsettings.json'],
    patterns: ['using Microsoft.AspNetCore', '[ApiController]', 'WebApplication.CreateBuilder']
  },

  BLAZOR: {
    files: ['_Host.cshtml', '_Layout.cshtml', 'App.razor'],
    patterns: ['@page', '@component', 'StateHasChanged']
  },

  // Go Frameworks
  GIN: {
    dependencies: ['github.com/gin-gonic/gin'],
    patterns: ['gin.Default()', 'gin.New()', 'c.JSON', 'router.Run']
  },

  ECHO: {
    dependencies: ['github.com/labstack/echo'],
    patterns: ['echo.New()', 'c.String', 'e.Start']
  },

  FIBER: {
    dependencies: ['github.com/gofiber/fiber'],
    patterns: ['fiber.New()', 'c.SendString', 'app.Listen']
  },

  // Rust Frameworks
  ACTIX: {
    dependencies: ['actix-web'],
    patterns: ['use actix_web', 'HttpServer::new', 'App::new']
  },

  ROCKET: {
    dependencies: ['rocket'],
    patterns: ['use rocket', '#[get', '#[post', 'rocket::launch']
  },

  WARP: {
    dependencies: ['warp'],
    patterns: ['use warp', 'warp::Filter', 'warp::serve']
  },

  // PHP Frameworks
  LARAVEL: {
    files: ['artisan', 'composer.json', 'config/app.php'],
    patterns: ['use Illuminate', 'Artisan::', 'Route::', 'Schema::']
  },

  SYMFONY: {
    files: ['symfony.lock', 'config/bundles.php'],
    patterns: ['use Symfony', 'AbstractController', 'Route(']
  },

  CODEIGNITER: {
    files: ['system/CodeIgniter.php', 'application/config'],
    patterns: ['CI_Controller', '$this->load']
  },

  // Ruby Frameworks
  RAILS: {
    files: ['Gemfile', 'config/application.rb', 'config/routes.rb'],
    dependencies: ['rails'],
    patterns: ['Rails.application', 'ApplicationController', 'resources :']
  },

  SINATRA: {
    dependencies: ['sinatra'],
    patterns: ['require "sinatra"', 'get "/"', 'post "/"']
  },

  // Mobile Frameworks
  REACT_NATIVE: {
    dependencies: ['react-native', '@react-native/'],
    files: ['metro.config.js', 'android/', 'ios/'],
    patterns: ['import {', 'from "react-native"', 'StyleSheet.create']
  },

  FLUTTER: {
    files: ['pubspec.yaml', 'lib/main.dart', 'android/', 'ios/'],
    patterns: ['import "package:flutter', 'StatelessWidget', 'StatefulWidget']
  },

  XAMARIN: {
    files: ['.csproj', 'MainPage.xaml'],
    patterns: ['Xamarin.Forms', 'ContentPage', 'using Xamarin']
  }
} as const;

// Build Tool Patterns
export const BUILD_TOOLS = {
  // JavaScript/TypeScript
  WEBPACK: ['webpack.config.js', 'webpack.config.ts', 'webpack.dev.js', 'webpack.prod.js'],
  VITE: ['vite.config.js', 'vite.config.ts'],
  ROLLUP: ['rollup.config.js', 'rollup.config.ts'],
  PARCEL: ['.parcelrc', 'parcel.config.js'],
  ESBUILD: ['esbuild.config.js'],
  GULP: ['gulpfile.js', 'gulpfile.ts'],
  GRUNT: ['Gruntfile.js', 'Gruntfile.coffee'],

  // Python
  SETUPTOOLS: ['setup.py', 'setup.cfg'],
  POETRY_BUILD: ['pyproject.toml'],
  WHEEL: ['wheel'],

  // Java
  MAVEN_BUILD: ['pom.xml'],
  GRADLE_BUILD: ['build.gradle', 'build.gradle.kts'],
  ANT: ['build.xml'],

  // .NET
  MSBUILD: ['.csproj', '.vbproj', '.fsproj'],
  DOTNET_CLI: ['global.json'],

  // Go
  GO_BUILD: ['go.mod'],

  // Rust
  CARGO_BUILD: ['Cargo.toml'],

  // Native
  CMAKE: ['CMakeLists.txt', 'cmake'],
  MAKE: ['Makefile', 'makefile'],
  MESON: ['meson.build'],
  BAZEL: ['BUILD', 'WORKSPACE'],

  // Others
  DOCKER: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'],
  KUBERNETES: ['deployment.yaml', 'service.yaml', 'ingress.yaml'],
  TERRAFORM: ['main.tf', 'variables.tf', 'outputs.tf']
} as const;

// Testing Framework Patterns
export const TESTING_FRAMEWORKS = {
  // JavaScript/TypeScript
  JEST: ['jest.config.js', 'jest.setup.js', '__tests__/', '*.test.js', '*.spec.js'],
  VITEST: ['vitest.config.js', 'vitest.config.ts'],
  CYPRESS: ['cypress.config.js', 'cypress/', 'cypress.json'],
  PLAYWRIGHT: ['playwright.config.js', 'playwright.config.ts'],
  MOCHA: ['mocha.opts', '.mocharc.json', 'test/mocha.opts'],

  // Python
  PYTEST: ['pytest.ini', 'pyproject.toml', 'conftest.py', 'test_*.py'],
  UNITTEST: ['test_*.py', '*_test.py'],
  NOSE: ['nose.cfg', '.noserc'],

  // Java
  JUNIT: ['pom.xml', 'build.gradle'], // Look for junit dependencies
  TESTNG: ['testng.xml'],

  // .NET
  MSTEST: ['*.csproj'], // Look for MSTest dependencies
  NUNIT: ['*.csproj'], // Look for NUnit dependencies
  XUNIT: ['*.csproj'], // Look for xUnit dependencies

  // Go
  GO_TEST: ['*_test.go'],

  // Rust
  RUST_TEST: ['tests/', 'src/lib.rs'], // Built-in testing

  // PHP
  PHPUNIT: ['phpunit.xml', 'phpunit.xml.dist'],

  // Ruby
  RSPEC: ['.rspec', 'spec/', 'spec_helper.rb'],
  MINITEST: ['test/', 'test_helper.rb']
} as const;

// Database Patterns
export const DATABASE_PATTERNS = {
  // SQL Databases
  POSTGRESQL: ['psycopg2', 'pg', 'postgres', 'postgresql'],
  MYSQL: ['mysql', 'mysql2', 'pymysql', 'MySQL-python'],
  SQLITE: ['sqlite3', 'better-sqlite3', 'sqlite'],
  MSSQL: ['mssql', 'pyodbc', 'System.Data.SqlClient'],
  ORACLE: ['oracledb', 'cx_Oracle'],

  // NoSQL Databases
  MONGODB: ['mongodb', 'mongoose', 'pymongo'],
  REDIS: ['redis', 'ioredis', 'redis-py'],
  CASSANDRA: ['cassandra-driver', 'datastax'],
  ELASTICSEARCH: ['@elastic/elasticsearch', 'elasticsearch'],

  // Cloud Databases
  DYNAMODB: ['aws-sdk', '@aws-sdk/client-dynamodb'],
  FIRESTORE: ['firebase-admin', '@google-cloud/firestore'],
  COSMOSDB: ['@azure/cosmos']
} as const;

// Cloud Platform Patterns
export const CLOUD_PLATFORMS = {
  AWS: ['aws-sdk', '@aws-sdk/', 'boto3', 'serverless.yml'],
  AZURE: ['@azure/', 'azure-', 'Azure.'],
  GCP: ['@google-cloud/', 'google-cloud-', 'gcloud'],
  VERCEL: ['vercel.json', '@vercel/'],
  NETLIFY: ['netlify.toml', '_redirects', '_headers'],
  HEROKU: ['Procfile', 'app.json'],
  DOCKER: ['Dockerfile', 'docker-compose.yml'],
  KUBERNETES: ['*.yaml', '*.yml'] // With k8s-specific content
} as const;

// Export unified pattern matching
export function getLanguageFromExtension(extension: string): string | null {
  const normalizedExtension = extension.toLowerCase();
  
  for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if ((extensions as readonly string[]).includes(normalizedExtension)) {
      return language.toLowerCase();
    }
  }
  return null;
}

export function getPackageManagerFromFiles(files: string[]): string[] {
  const detectedManagers: string[] = [];

  for (const [manager, patterns] of Object.entries(PACKAGE_FILES)) {
    if ((patterns as readonly string[]).some(pattern => 
      files.some(file => file.includes(pattern))
    )) {
      detectedManagers.push(manager.toLowerCase());
    }
  }

  return detectedManagers;
}

export function getFrameworksFromDependencies(dependencies: string[]): string[] {
  const detectedFrameworks: string[] = [];

  for (const [framework, config] of Object.entries(FRAMEWORK_PATTERNS)) {
    const frameworkConfig = config as any;
    if (frameworkConfig.dependencies?.some((dep: string) =>
      dependencies.some(dependency => dependency.includes(dep))
    )) {
      detectedFrameworks.push(framework.toLowerCase());
    }
  }

  return detectedFrameworks;
}