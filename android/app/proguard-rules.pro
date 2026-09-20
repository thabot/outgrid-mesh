# OutGrid Mesh - ProGuard & R8 Optimization and Preservation Rules
# Protocol: TOG v1.1 Master Project Plan v6.1 Phase 7 & Sprint H Task H.1
# Creator & Lead Architect: Thabot <thabo47@gmail.com>

# Keep JavascriptInterface methods accessible by WebView
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve OutGrid Android Bridge and Native Classes
-keep class io.outgrid.mesh.** { *; }
-keepclassmembers class io.outgrid.mesh.** { *; }

# Preserve Android WebKit AssetLoader
-keep class androidx.webkit.** { *; }

# Preserve Coroutines and Lifecycle
-keep class kotlinx.coroutines.** { *; }

# Prevent obfuscation of wire models and JSON serializable models
-keepclassmembers class * {
    public <fields>;
    public <methods>;
}

# Keep line numbers for emergency crash stack traces
-keepattributes SourceFile,LineNumberTable
