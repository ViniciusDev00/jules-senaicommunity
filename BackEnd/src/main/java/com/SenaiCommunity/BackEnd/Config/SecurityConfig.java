package com.SenaiCommunity.BackEnd.Config;

import com.SenaiCommunity.BackEnd.Security.JWTFilter;
import com.SenaiCommunity.BackEnd.Service.UsuarioDetailsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private UsuarioDetailsService userDetailsService;

    private final JWTFilter jwtFilter;

    public SecurityConfig(JWTFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // Habilita o CORS
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.POST, "/autenticacao/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/autenticacao/login/google").permitAll()
                        .requestMatchers(HttpMethod.POST, "/cadastro/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/projetos/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/eventos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/projetos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/vagas/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/vagas/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/projetos/**").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/projetos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/alunos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/professores/**").permitAll()
                        .requestMatchers("/auth/**", "/cadastro/**", "/ws/**", "/login**", "/oauth2/**").permitAll()
                        .requestMatchers("/images/**", "/api/arquivos/**").permitAll()
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (req, res, excep) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido ou ausente")
                ))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // ✅ --- CORREÇÃO APLICADA AQUI --- ✅
        // Adicionado "http://localhost:5173" (seu frontend React) à lista de origens permitidas.
        configuration.setAllowedOrigins(List.of(
                "http://127.0.0.1:5500",
                "http://127.0.0.1:5501",
                "http://localhost:3000",
                "http://127.0.0.1:5502",
                "http://localhost:5173" // <-- ADICIONADO
        ));
        // --- FIM DA CORREÇÃO ---

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder builder = http.getSharedObject(AuthenticationManagerBuilder.class);
        builder.userDetailsService(userDetailsService).passwordEncoder(passwordEncoder());
        return builder.build();
    }
}