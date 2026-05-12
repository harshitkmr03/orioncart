package com.orioncart.backend.controller;

import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.util.HashMap;
import java.util.Map;

// Disabled duplicate exception handler (project already contains a global handler in config package)
public class GlobalExceptionHandler {

    @ExceptionHandler({ InvalidFormatException.class, HttpMessageNotReadableException.class })
    public ResponseEntity<Map<String, String>> handleJsonParseException(Exception ex) {
        Map<String, String> body = new HashMap<>();
        body.put("message", "Malformed JSON or invalid value in request");
        body.put("detail", ex.getMessage());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        Map<String, String> body = new HashMap<>();
        body.put("message", "Invalid request parameter");
        body.put("detail", ex.getMessage());
        return ResponseEntity.badRequest().body(body);
    }
}

