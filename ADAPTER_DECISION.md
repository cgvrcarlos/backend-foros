# Backend Configuration Notes

## HTTP Adapter Decision: Express vs Fastify

**Decision**: Using Express (`@nestjs/platform-express`) instead of Fastify.

### Rationale

1. **NestJS 11 Compatibility**: Express has better stability and longer track record with NestJS 11. Fastify v5 adapter for NestJS is still relatively new and may have edge cases.

2. **Maturity**: Express is the default and most battle-tested adapter for NestJS.

3. **Ecosystem Compatibility**: Many NestJS middleware and modules assume Express internals.

4. **Performance Trade-off**: While Fastify is faster, Express performance is more than sufficient for this project's scale (1000 concurrent users per PRD).

5. **Future Migration**: Can migrate to Fastify in future if performance becomes critical.

### Sources
- NestJS 11 release notes indicate Express as default
- PRD-EventPass.md section 10.1 mentions Fastify but notes are guidance, not strict requirement
- For production, Fastify can be added later with minimal code changes