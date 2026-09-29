"""Configuration, validated at boot. A bad value stops the process."""

from functools import lru_cache
from ipaddress import ip_network

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from assistant.providers import ProviderKind


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DULY_", env_file=None, extra="forbid")

    env: str = Field(default="dev", pattern="^(dev|test|e2e|attack|staging|prod)$")
    database_url: str = "postgresql+psycopg://duly:duly@localhost:5432/duly"
    ops_ip_allowlist: str = "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    assistant_provider: ProviderKind = ProviderKind.NONE
    email_from_alerts: str = "no-reply@duly.invalid"
    email_from_brief: str = "updates@duly.invalid"
    email_from_account: str = "no-reply@duly.invalid"
    worker_interval_seconds: float = Field(default=5.0, gt=0)

    @field_validator("ops_ip_allowlist")
    @classmethod
    def _networks_parse(cls, value: str) -> str:
        for part in value.split(","):
            ip_network(part.strip(), strict=False)
        return value

    @property
    def ops_networks(self) -> list[str]:
        return [p.strip() for p in self.ops_ip_allowlist.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
