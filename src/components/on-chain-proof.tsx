'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Copy, ExternalLink, FileCode2, Hash, Shield } from 'lucide-react'

interface OnChainProofProps {
  contractAddr?: string | null
  txHash?: string | null
  nftTokenId?: string | null
  createdAt: string
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      <span className="ml-1 text-xs">{copied ? 'Copied!' : label}</span>
    </Button>
  )
}

export function OnChainProof({ contractAddr, txHash, nftTokenId, createdAt }: OnChainProofProps) {
  if (!contractAddr && !txHash) {
    return null
  }

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-emerald-400" />
          <span>On-Chain Proof</span>
          <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
            VERIFIED
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Address */}
        {contractAddr && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">Contract Address</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <code className="text-xs font-mono text-foreground break-all flex-1">{contractAddr}</code>
              <CopyButton text={contractAddr} label="Copy" />
            </div>
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">Transaction Hash</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <code className="text-xs font-mono text-foreground break-all flex-1">{txHash}</code>
              <CopyButton text={txHash} label="Copy" />
            </div>
          </div>
        )}

        {/* NFT Token ID */}
        {nftTokenId && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">NFT Token ID</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
              <code className="text-xs font-mono text-foreground">#{nftTokenId}</code>
              <CopyButton text={nftTokenId} label="Copy" />
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="pt-2 border-t border-border/30">
          <p className="text-xs text-muted-foreground">
            Published on {new Date(createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Content hash verified on simulated Ethereum blockchain
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
