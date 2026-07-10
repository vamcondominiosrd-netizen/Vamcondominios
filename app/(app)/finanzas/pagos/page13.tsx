"use client";

import PageContainer from "@/components/vam/enterprise/PageContainer";

import {
  PagosKPI,
  PagosMenu,
  PagosQuickAccess,
  PagosToolbar,
} from "./components";

export default function FinanzasPagosPage() {
  return (
    <PageContainer>
      <PagosMenu />
      <PagosToolbar />
      <PagosKPI />
      <PagosQuickAccess />
    </PageContainer>
  );
}
