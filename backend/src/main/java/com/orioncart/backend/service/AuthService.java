package com.orioncart.backend.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.Optional;

@Service
public class AuthService {
    private final Key signingKey;
    private final long expirationMillis;

    public AuthService(@Value("${jwt.secret}") String jwtSecret,
                       @Value("${jwt.expiration:86400000}") long jwtExpiration) {
        // Use secret bytes to create HMAC-SHA key
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = jwtExpiration;
    }

    public String createTokenForUser(Long userId) {
        long now = System.currentTimeMillis();
        Date issuedAt = new Date(now);
        Date exp = new Date(now + expirationMillis);

        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(issuedAt)
                .setExpiration(exp)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Optional<Long> getUserIdForToken(String token) {
        if (token == null) return Optional.empty();
        try {
            Jws<Claims> parsed = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token);
            String sub = parsed.getBody().getSubject();
            return Optional.of(Long.parseLong(sub));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    public void invalidateToken(String token) {
        // Stateless JWTs cannot be invalidated server-side without additional storage.
        // For now, no-op. To support invalidation, persist tokens or use a revocation list.
    }
}

