/**
 * @fileoverview Framework Patterns - Comprehensive framework detection patterns
 * 
 * This module contains framework detection patterns for all major web frameworks,
 * backend frameworks, and libraries across different programming languages.
 * 
 * @author AIOS Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { FrameworkPattern } from '../../../types/config.types.js'

/**
 * Comprehensive framework patterns for all supported languages and ecosystems.
 * Organized by language for easy filtering and lookup.
 */
export const FRAMEWORK_PATTERNS: FrameworkPattern[] = [
  // JavaScript/TypeScript frameworks
  {
    name: 'react',
    language: 'javascript',
    dependencies: ['react', '@types/react'],
    files: ['src/App.jsx', 'src/App.tsx', 'public/index.html', 'src/index.js', 'src/index.tsx'],
    patterns: ['import.*react', 'React\\.', 'createElement', 'jsx', 'JSX'],
    confidence: 0.9
  },
  {
    name: 'next.js',
    language: 'javascript',
    dependencies: ['next'],
    files: ['next.config.js', 'pages/', 'app/', 'middleware.ts', 'next-env.d.ts'],
    patterns: ['import.*next', 'getServerSideProps', 'getStaticProps', 'getStaticPaths', 'getInitialProps'],
    confidence: 0.95
  },
  {
    name: 'vue',
    language: 'javascript',
    dependencies: ['vue', '@vue/'],
    files: ['src/App.vue', 'vue.config.js', 'nuxt.config.js'],
    patterns: ['<template>', '<script>', 'Vue\\.', 'createApp', 'defineComponent'],
    confidence: 0.9
  },
  {
    name: 'nuxt',
    language: 'javascript',
    dependencies: ['nuxt', '@nuxtjs/'],
    files: ['nuxt.config.js', 'nuxt.config.ts', 'pages/', 'components/'],
    patterns: ['defineNuxtConfig', 'useNuxtApp', 'navigateTo'],
    confidence: 0.95
  },
  {
    name: 'sveltekit',
    language: 'javascript',
    dependencies: ['@sveltejs/kit', 'svelte'],
    files: ['svelte.config.js', 'src/app.html', 'src/routes/', 'src/lib/'],
    patterns: ['@sveltejs/kit', 'load', 'page\\.', 'goto', '\\$app/'],
    confidence: 0.95
  },
  {
    name: 'angular',
    language: 'typescript',
    dependencies: ['@angular/core'],
    files: ['angular.json', 'src/app/app.module.ts', 'src/main.ts'],
    patterns: ['@Component', '@Injectable', '@NgModule', 'Angular', 'platformBrowserDynamic'],
    confidence: 0.95
  },
  {
    name: 'svelte',
    language: 'javascript',
    dependencies: ['svelte', '@sveltejs/kit'],
    files: ['src/App.svelte', 'svelte.config.js', 'app.html'],
    patterns: ['<script>', 'export let', 'onMount', 'createEventDispatcher'],
    confidence: 0.9
  },
  {
    name: 'express',
    language: 'javascript',
    dependencies: ['express'],
    files: ['app.js', 'server.js', 'index.js', 'routes/'],
    patterns: ['express\\(\\)', 'app\\.listen', 'app\\.get', 'app\\.post', 'app\\.use'],
    confidence: 0.85
  },
  {
    name: 'koa',
    language: 'javascript',
    dependencies: ['koa'],
    files: ['app.js', 'server.js', 'index.js'],
    patterns: ['new Koa', 'app\\.use', 'ctx\\.body', 'ctx\\.request'],
    confidence: 0.85
  },
  {
    name: 'nest',
    language: 'typescript',
    dependencies: ['@nestjs/core'],
    files: ['main.ts', 'app.module.ts', 'src/'],
    patterns: ['@Controller', '@Injectable', '@Module', 'NestFactory'],
    confidence: 0.9
  },

  // Python frameworks
  {
    name: 'django',
    language: 'python',
    dependencies: ['django'],
    files: ['manage.py', 'settings.py', 'urls.py', 'wsgi.py', 'models.py'],
    patterns: ['from django', 'import django', 'DJANGO_SETTINGS_MODULE', 'INSTALLED_APPS'],
    confidence: 0.95
  },
  {
    name: 'flask',
    language: 'python',
    dependencies: ['flask'],
    files: ['app.py', 'wsgi.py', 'main.py'],
    patterns: ['from flask', 'Flask\\(__name__\\)', '@app\\.route', 'render_template'],
    confidence: 0.9
  },
  {
    name: 'fastapi',
    language: 'python',
    dependencies: ['fastapi'],
    files: ['main.py', 'app.py'],
    patterns: ['from fastapi', 'FastAPI\\(\\)', '@app\\.(get|post|put|delete)', 'APIRouter'],
    confidence: 0.9
  },
  {
    name: 'tornado',
    language: 'python',
    dependencies: ['tornado'],
    files: ['main.py', 'app.py'],
    patterns: ['import tornado', 'tornado\\.web', 'RequestHandler'],
    confidence: 0.85
  },
  {
    name: 'pyramid',
    language: 'python',
    dependencies: ['pyramid'],
    files: ['development.ini', 'production.ini', 'main.py'],
    patterns: ['from pyramid', 'Configurator', 'pyramid\\.config'],
    confidence: 0.85
  },
  {
    name: 'quart',
    language: 'python',
    dependencies: ['quart'],
    files: ['main.py', 'app.py'],
    patterns: ['from quart', 'Quart\\(__name__\\)', '@app\\.route', 'await.*render_template'],
    confidence: 0.9
  },

  // Java frameworks
  {
    name: 'spring-boot',
    language: 'java',
    dependencies: ['org.springframework.boot'],
    files: ['Application.java', 'application.properties', 'application.yml'],
    patterns: ['@SpringBootApplication', '@RestController', '@Service', '@Repository'],
    confidence: 0.95
  },
  {
    name: 'spring-mvc',
    language: 'java',
    dependencies: ['org.springframework'],
    files: ['web.xml', 'applicationContext.xml', 'dispatcher-servlet.xml'],
    patterns: ['@Controller', '@RequestMapping', 'DispatcherServlet'],
    confidence: 0.9
  },
  {
    name: 'hibernate',
    language: 'java',
    dependencies: ['org.hibernate'],
    files: ['hibernate.cfg.xml', 'persistence.xml'],
    patterns: ['@Entity', '@Table', '@Column', 'SessionFactory'],
    confidence: 0.9
  },
  {
    name: 'jpa',
    language: 'java',
    dependencies: ['javax.persistence'],
    files: ['persistence.xml', 'orm.xml'],
    patterns: ['@Entity', '@Table', '@Id', '@GeneratedValue'],
    confidence: 0.9
  },

  // Go frameworks
  {
    name: 'gin',
    language: 'go',
    dependencies: ['github.com/gin-gonic/gin'],
    files: ['main.go', 'routes.go'],
    patterns: ['gin\\.New', 'c\\.JSON', 'r\\.GET', 'r\\.POST'],
    confidence: 0.9
  },
  {
    name: 'echo',
    language: 'go',
    dependencies: ['github.com/labstack/echo'],
    files: ['main.go', 'handlers.go'],
    patterns: ['echo\\.New', 'c\\.JSON', 'e\\.GET', 'e\\.POST'],
    confidence: 0.9
  },
  {
    name: 'fiber',
    language: 'go',
    dependencies: ['github.com/gofiber/fiber'],
    files: ['main.go', 'app.go'],
    patterns: ['fiber\\.New', 'c\\.JSON', 'app\\.Get', 'app\\.Post'],
    confidence: 0.9
  },
  {
    name: 'chi',
    language: 'go',
    dependencies: ['github.com/go-chi/chi'],
    files: ['main.go', 'routes.go', 'handlers.go'],
    patterns: ['chi\\.NewRouter', 'r\\.Route', 'r\\.Get', 'r\\.Post', 'chi\\.Mux'],
    confidence: 0.9
  },
  {
    name: 'gorilla-mux',
    language: 'go',
    dependencies: ['github.com/gorilla/mux'],
    files: ['main.go', 'routes.go'],
    patterns: ['mux\\.NewRouter', 'router\\.HandleFunc', 'mux\\.Vars'],
    confidence: 0.85
  },
  {
    name: 'iris',
    language: 'go',
    dependencies: ['github.com/kataras/iris'],
    files: ['main.go', 'app.go'],
    patterns: ['iris\\.New', 'app\\.Get', 'app\\.Post', 'ctx\\.JSON'],
    confidence: 0.9
  },

  // Rust frameworks
  {
    name: 'actix-web',
    language: 'rust',
    dependencies: ['actix-web'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['actix_web::', 'HttpServer::new', 'App::new', 'web::resource'],
    confidence: 0.9
  },
  {
    name: 'rocket',
    language: 'rust',
    dependencies: ['rocket'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['rocket::', '#\\[rocket::main\\]', '#\\[get\\]', '#\\[post\\]'],
    confidence: 0.9
  },
  {
    name: 'warp',
    language: 'rust',
    dependencies: ['warp'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['warp::', 'warp::serve', 'warp::path', 'warp::get'],
    confidence: 0.9
  },
  {
    name: 'axum',
    language: 'rust',
    dependencies: ['axum'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['axum::', 'Router::new', 'axum::extract', 'axum::response'],
    confidence: 0.9
  },
  {
    name: 'poem',
    language: 'rust',
    dependencies: ['poem'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['poem::', 'Route::new', 'poem::handler', 'poem::middleware'],
    confidence: 0.85
  },
  {
    name: 'tide',
    language: 'rust',
    dependencies: ['tide'],
    files: ['main.rs', 'src/main.rs'],
    patterns: ['tide::', 'Server::new', 'tide::Request', 'tide::Response'],
    confidence: 0.8
  },

  // .NET frameworks
  {
    name: 'aspnet-core',
    language: 'dotnet',
    dependencies: ['Microsoft.AspNetCore'],
    files: ['Program.cs', 'Startup.cs', 'Controllers/'],
    patterns: ['WebApplication', 'app\\.MapGet', 'app\\.MapPost', '\\[ApiController\\]'],
    confidence: 0.95
  },
  {
    name: 'mvc',
    language: 'dotnet',
    dependencies: ['Microsoft.AspNetCore.Mvc'],
    files: ['Controllers/', 'Views/', 'Models/'],
    patterns: ['\\[Controller\\]', '\\[HttpGet\\]', '\\[HttpPost\\]', 'ViewResult'],
    confidence: 0.9
  },

  // PHP frameworks
  {
    name: 'laravel',
    language: 'php',
    dependencies: ['laravel/framework'],
    files: ['artisan', 'app/Http/Controllers/', 'routes/web.php'],
    patterns: ['Illuminate\\\\', 'Route::', 'class.*Controller', '\\$this->'],
    confidence: 0.95
  },
  {
    name: 'symfony',
    language: 'php',
    dependencies: ['symfony/framework-bundle'],
    files: ['composer.json', 'src/Controller/', 'config/routes.yaml'],
    patterns: ['Symfony\\\\', 'use Symfony\\\\', '\\$this->get'],
    confidence: 0.95
  },
  {
    name: 'codeigniter',
    language: 'php',
    dependencies: ['codeigniter/framework'],
    files: ['index.php', 'application/', 'system/'],
    patterns: ['CI_Controller', '\\$this->load', '\\$this->input'],
    confidence: 0.9
  },

  // Ruby frameworks
  {
    name: 'rails',
    language: 'ruby',
    dependencies: ['rails'],
    files: ['Gemfile', 'app/controllers/', 'app/models/', 'config/routes.rb'],
    patterns: ['class.*Controller', 'ApplicationController', 'ActiveRecord::', 'ActionController::'],
    confidence: 0.95
  },
  {
    name: 'sinatra',
    language: 'ruby',
    dependencies: ['sinatra'],
    files: ['app.rb', 'main.rb', 'config.ru'],
    patterns: ['require.*sinatra', 'get.*do', 'post.*do', 'Sinatra::'],
    confidence: 0.9
  }
];

/**
 * Gets all framework patterns for a specific language.
 * 
 * @param {string} language - The target language
 * @returns {FrameworkPattern[]} Array of framework patterns for the language
 */
export function getFrameworkPatterns(language: string): FrameworkPattern[] {
  return FRAMEWORK_PATTERNS.filter(fw => fw.language === language);
}

/**
 * Gets a specific framework pattern by name and language.
 * 
 * @param {string} frameworkName - The name of the framework
 * @param {string} language - The target language
 * @returns {FrameworkPattern | undefined} The framework pattern or undefined if not found
 */
export function getFrameworkPattern(frameworkName: string, language: string): FrameworkPattern | undefined {
  return FRAMEWORK_PATTERNS.find(fw => fw.name === frameworkName && fw.language === language);
}

/**
 * Gets all supported frameworks for a language.
 * 
 * @param {string} language - The target language
 * @returns {string[]} Array of framework names
 */
export function getSupportedFrameworks(language: string): string[] {
  return getFrameworkPatterns(language).map(fw => fw.name);
}

/**
 * Gets all languages that have framework patterns defined.
 * 
 * @returns {string[]} Array of language names with framework patterns
 */
export function getLanguagesWithFrameworks(): string[] {
  return Array.from(new Set(FRAMEWORK_PATTERNS.map(fw => fw.language)));
}

/**
 * Checks if a framework is supported for a specific language.
 * 
 * @param {string} frameworkName - The name of the framework
 * @param {string} language - The target language
 * @returns {boolean} True if the framework is supported for the language
 */
export function isFrameworkSupported(frameworkName: string, language: string): boolean {
  return FRAMEWORK_PATTERNS.some(fw => fw.name === frameworkName && fw.language === language);
}
